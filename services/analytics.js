var dbService = require('./model');

var calculateTransactionAmount = function(financeTransaction, real){
  var sumWithCondition = function(condition){
    return financeTransaction.FinanceTransactionComponents.reduce(function(sum, financeTransactionComponent){
      return sum + (condition(financeTransactionComponent) ? financeTransactionComponent.getRawAmount() : 0);
    }, 0);
  };

  if(real === true)
    return sumWithCondition(function(){return true;});

  if(financeTransaction.type === "expenseincome")
    return sumWithCondition(function(){return true;});
  var amountPositive = sumWithCondition(function(financeTransactionComponent){
    return financeTransactionComponent.getRawAmount() >= 0;
  });
  var amountNegative = sumWithCondition(function(financeTransactionComponent){
    return financeTransactionComponent.getRawAmount() <= 0;
  });
  return amountPositive > -amountNegative ? amountPositive : -amountNegative;
};

var groupTagExpenses = function(financeTransactions){
  var tags = {};
  financeTransactions.map(function(financeTransaction){
    var financeTransactionTags = financeTransaction.tags;
    var addTagAmount = function(tag){
      if(tags[tag] === undefined)
        tags[tag] = 0;
      tags[tag] += financeTransaction.rawAmount;
    };
    if(financeTransactionTags.length === 0)
      addTagAmount("");
    else
      financeTransactionTags.forEach(addTagAmount);
  });
  return tags;
};

var buildBalanceChart = function(financeTransactions, earliestDate, latestDate){
  earliestDate = new Date(earliestDate);
  latestDate = new Date(latestDate);
  var dayChanges = {};
  financeTransactions.forEach(function(financeTransaction){
    if(dayChanges[financeTransaction.date] === undefined)
      dayChanges[financeTransaction.date] = 0;
    dayChanges[financeTransaction.date] += financeTransaction.rawRealAmount;
  });
  var currentBalance = 0;
  var dayBalances = {};
  Object.keys(dayChanges).map(function(date){
    return {date: date, delta: dayChanges[date]};
  }).sort(function(a, b){
    return new Date(a.date) - new Date(b.date);
  }).forEach(function(dayChange){
    currentBalance += dayChange.delta;
    var dayChangeDate = new Date(dayChange.date);
    if(dayChangeDate >= earliestDate && dayChangeDate <= latestDate)
      dayBalances[dayChange.date] = dbService.convertAmountToFloat(currentBalance);
  });
  return dayBalances;
};

var buildReport = function(user, request){
  var earliestDate = new Date(request.earliestDate);
  var latestDate = new Date(request.latestDate);
  var enabledTransferTransactions = request.enabledTransferTransactions;
  var enabledIncomeTransactions = request.enabledIncomeTransactions;
  var enabledExpenseTransactions = request.enabledExpenseTransactions;
  var selectedTags = request.selectedTags;
  var selectedAccounts = request.selectedAccounts;

  var report = {};

  var buildTransactionsWhere = function(filterDate){
    var transactionsWhere = {UserId: user.id};
    if(filterDate === true)
      transactionsWhere.date = {$between: [earliestDate, latestDate]};
    var transactionTypeCondition = [];
    if(enabledTransferTransactions)
      transactionTypeCondition.push("transfer");
    if(enabledIncomeTransactions || enabledExpenseTransactions)
      transactionTypeCondition.push("expenseincome");
    transactionsWhere.type = {$in: transactionTypeCondition};
    var realTags = selectedTags.filter(function(tag){
      return tag.length > 0;
    });
    transactionsWhere.$or = realTags.map(function(tag){return {tags: {$like: '%"' + tag + '"%'}}});
    if(selectedTags.some(function(tag){ return tag.length === 0; }))
      transactionsWhere.$or.push({tags: JSON.stringify([])});
    if(selectedTags.length === 0)
      transactionsWhere.$or = {tags: undefined};
    return transactionsWhere;
  };

  var finalTransactionFilter = function(financeTransaction){
    return (financeTransaction.type === "transfer" && enabledTransferTransactions)
      || (financeTransaction.type === "expenseincome" && financeTransaction.rawAmount <= 0 && enabledExpenseTransactions)
      || (financeTransaction.type === "expenseincome" && financeTransaction.rawAmount >= 0 && enabledIncomeTransactions);
  };

  return dbService.Account.findAll({where: {UserId: user.id, id: {$in: selectedAccounts}}}).then(function(accounts){
    //Find and validate accounts
    var currencies = {};
    accounts.forEach(function(account){
      var currency = account.currency;
      if(currencies[currency] === undefined)
         currencies[currency] = [];
      currencies[currency].push(account);
    });
    return currencies;
  }).then(function(currencies){
    var financeTransactionComponentWhere = function(currency){
      var accountsIds = currencies[currency].map(function(account){
        return account.id;
      });
      return {AccountId: {$in: accountsIds}};
    };
    return Promise.all(Object.keys(currencies).map(function(currency){
      return dbService.FinanceTransaction.findAll({
        where: buildTransactionsWhere(true),
        include: [
          {model: dbService.FinanceTransactionComponent, where: financeTransactionComponentWhere(currency)}
        ]
      }).then(function(financeTransactions){
        report[currency] = {};
        if(financeTransactions.length > 0){
          var sortFunction = function(a, b){ return Math.abs(b.rawAmount) - Math.abs(a.rawAmount); };
          var processedFinanceTransactions = financeTransactions.map(function(financeTransaction){
            return {
              description: financeTransaction.description,
              rawAmount: calculateTransactionAmount(financeTransaction, false),
              date: financeTransaction.date,
              type: financeTransaction.type,
              tags: financeTransaction.tags
            };
          }).filter(finalTransactionFilter);
          var tagExpenses = groupTagExpenses(processedFinanceTransactions);
          var sortedTagExpenses = Object.keys(tagExpenses).map(function(tag){
            return {tag: tag, rawAmount: tagExpenses[tag]};
          }).sort(sortFunction).map(function(tagExpense){
            tagExpense.amount = dbService.convertAmountToFloat(tagExpense.rawAmount);
            delete tagExpense.rawAmount;
            return tagExpense;
          });
          var sortedTransactions = processedFinanceTransactions.sort(sortFunction).map(function(financeTransaction){
            delete financeTransaction.tags;
            financeTransaction.amount = dbService.convertAmountToFloat(financeTransaction.rawAmount);
            financeTransaction.date = financeTransaction.date;
            delete financeTransaction.rawAmount;
            return financeTransaction;
          });
          report[currency].financeTransactions = sortedTransactions;
          report[currency].tagExpenses = sortedTagExpenses;
        }
      }).then(function(){
        return dbService.FinanceTransaction.findAll({
          where: buildTransactionsWhere(false),
          include: [
            {model: dbService.FinanceTransactionComponent, where: financeTransactionComponentWhere(currency)}
          ]
        });
      }).then(function(financeTransactions){
        var processedFinanceTransactions = financeTransactions.map(function(financeTransaction){
          return {
            rawAmount: calculateTransactionAmount(financeTransaction, false),
            rawRealAmount: calculateTransactionAmount(financeTransaction, true),
            date: financeTransaction.date,
            type: financeTransaction.type
          };
        }).filter(finalTransactionFilter);
        var accountsBalanceGraph = buildBalanceChart(processedFinanceTransactions, earliestDate, latestDate);
        report[currency].accountsBalanceGraph = accountsBalanceGraph;
      });
    }));
  }).then(function(){
    Object.keys(report).forEach(function(currency){
      var reportForCurrency = report[currency];
      if(Object.keys(reportForCurrency.accountsBalanceGraph).length === 0 && reportForCurrency.financeTransactions === undefined && reportForCurrency.tagExpenses === undefined)
        delete report[currency];
    });
    return report;
  });
};

exports.buildReport = buildReport;
