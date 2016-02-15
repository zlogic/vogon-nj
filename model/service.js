var Sequelize = require('sequelize');
var path = require('path');
var os = require('os');

var sequelizeConfigurer = function(){
  if(process.env.DATABASE_URL !== undefined)
    return new Sequelize(process.env.DATABASE_URL);
  else
    return new Sequelize("sqlite:", {storage: path.resolve(os.tmpdir(), "vogon-nj.sqlite")});
};

var sequelize = sequelizeConfigurer();

var Account = sequelize.define('Account', {
  name: Sequelize.STRING,
  balance: Sequelize.BIGINT,
  currency: Sequelize.STRING,
  includeInTotal: Sequelize.BOOLEAN,
  showInList: Sequelize.BOOLEAN
}, {
  timestamps: false
});

var Transaction = sequelize.define('Transaction', {
  type: Sequelize.ENUM("expenseincome", "transfer", "undefined"),
  description: Sequelize.STRING,
  //tags: Sequelize.ARRAY(Sequelize.STRING),
  date: Sequelize.DATE,
  amount: Sequelize.BIGINT
}, {
  timestamps: false
});

var TransactionComponent = sequelize.define('TransactionComponent', {
  amount: Sequelize.BIGINT
}, {
  timestamps: false
});

var User = sequelize.define('User', {
  username: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  password: Sequelize.STRING
}, {
  timestamps: false
});

TransactionComponent.belongsTo(Transaction);
TransactionComponent.belongsTo(Account);
Transaction.hasMany(TransactionComponent);
User.hasMany(Transaction);
User.hasMany(Account);

//sequelize.sync();

exports.sequelize = sequelize;
exports.User = User;
exports.Transaction = Transaction;
exports.TransactionComponent = TransactionComponent;
exports.Account = Account;
