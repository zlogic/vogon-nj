// Error and status code translations
var translations = {
  //Angular UI
  "Dismiss": "Dismiss",
  "resetAuthorization not properly initialized": "resetAuthorization not properly initialized",
  "HTTP error: {0} ({1})": "HTTP error: {0} ({1})",
  "Unable to authenticate": "Unable to authenticate",
  "Already logged out": "Already logged out",
  //Server side errors
  "Password is not set": "Password is not set",
  "FinanceTransactionComponent afterUpdate hook can only be run from a transaction": "FinanceTransactionComponent afterUpdate hook can only be run from a transaction",
  "FinanceTransactionComponent afterDestroy hook can only be run from a transaction": "FinanceTransactionComponent afterDestroy hook can only be run from a transaction",
  "conflictResolutionHook hook can only be run from a transaction": "conflictResolutionHook hook can only be run from a transaction",
  "Data was already updated from another session": "Data was already updated from another session",
  "Import can only be run from a transaction": "Import can only be run from a transaction",
  "Cannot import data for unknown user": "Cannot import data for unknown user",
  "Cannot export data for unknown user": "Cannot export data for unknown user",
  "Bad credentials": "Bad credentials",
  "Cannot create token": "Cannot create token",
  "Cannot delete non-existing token": "Cannot delete non-existing token",
  "User already exists": "User already exists",
  "Cannot register user because of error: {0}": "Cannot register user because of error: {0}",
  "Registration is not allowed": "Registration is not allowed",
  "Transaction does not exist": "Transaction does not exist",
  "Cannot set an invalid account id": "Cannot set an invalid account id",
  "Cannot delete non-existing transaction": "Cannot delete non-existing transaction"
}

//TODO: replace this temporary workaround once https://github.com/angular/angular/issues/11405 is implemented
export class I18nService {
  __(str: string, ...args: string[]): string {
    //TODO: Add some sort of escaping?
    var mappedTranslation = translations[str]
    if(mappedTranslation !== undefined)
      str = mappedTranslation;
    for(var i=0; i < args.length; i++)
      str = str.replace("{" + i + "}", args[i]);
    return str;
  }
}
