var app = Application.currentApplication();
app.includeStandardAdditions = true;
var appName = "Sue's backup utility";
var durationBetweenBackups = 1000 * 60 * 60 * 24 * 7;
var backupAttempts = 0;
var maxNumberOfAttempts = 5;

function backupRequired() {
  var lastBackupDate = app.doShellScript("tail -1 ~/.suesbackups");
  var lastBackupMillis = new Date(lastBackupDate).getTime();
  var now = new Date().getTime();

  if (now >= (lastBackupMillis + durationBetweenBackups)) {
    return true;
  } else {
    return false;
  }
}

function doBackupJob() {
  var dialogText = "It's time to back up!\n\nPlug in your external hard drive and click 'OK'.\n\nClick 'Cancel' if you don't want to backup now, and I'll remind you tomorrow.";
  var result = app.displayDialog(dialogText, {withIcon: "caution", withTitle: appName});

  if (result.buttonReturned === "OK") {
	 mountAndBackup();
  }
}

function mountAndBackup() {
  backupAttempts++;
  try {
    var myPassportIsNotMounted = !app.listDisks().includes("My Passport");
    if (myPassportIsNotMounted) {
      while (myPassportIsNotMounted) {
        delay(3);
	      myPassportIsNotMounted = !app.listDisks().includes("My Passport");
      }
    }

    Progress.description = "Backing up via Time Machine... this may take a few minutes.";
    Progress.totalUnitCount = 100;
    Progress.completedUnitCount = 0;
    Progress.additionalDescription = "Calculating time to complete backup...";
    app.doShellScript("tmutil startbackup -b > /dev/null 2>&1 &");

    delay(4);
    var totalUnitCount = app.doShellScript("tmutil status | awk '/TimeRemaining/ {print $3}'").replace(';','');
    var running = app.doShellScript("tmutil status | awk '/Running/ {print $3}'") === "1;";
    while (running) {
      var timeRemainingString = app.doShellScript("tmutil status | awk '/TimeRemaining/ {print $3}'");
      var timeRemaining = parseInt(timeRemainingString.replace(';',''));
      if (timeRemaining > 0) {
        Progress.totalUnitCount = (totalUnitCount === 0) ? 20 : totalUnitCount * 2;
	      Progress.completedUnitCount = (totalUnitCount - timeRemaining) * 0.8;
	      var minutesLeft = Math.round((timeRemaining + 180) / 60);
	      Progress.additionalDescription = "Time to complete backup: approximately " + minutesLeft + " minutes.";
	      delay(1);
      }
      running = app.doShellScript("tmutil status | awk '/Running/ {print $3}'") === "1;";
    }

    app.doShellScript('date +%Y-%m-%d >> ~/.suesbackups');
    app.displayDialog("Finished!\n\nTime Machine backup complete.\n\nYou can now safely disconnect the external hard drive!", {buttons: "OK", withTitle: appName});
  } catch(err) {
    couldntMount();
  }
}

function couldntMount() {
  var dialogText = "Something isn't quite right.\n\nClick 'OK' to try again.\n\nClick 'Cancel' if you don't want to do this now. You will be reminded next time you log in to your computer.";
  var result = app.displayDialog(dialogText, {withIcon: "caution", withTitle: appName});
  if (backupAttempts >= maxNumberOfAttempts) {
    dialogText = "Something went reaaaaaally wrong with the backup. Don't panic! Let Tom know it didn't work and he'll fix it.";
    app.displayDialog(dialogText, {withIcon: "stop", withTitle: appName});
  } else if (result.buttonReturned === "OK" && backupAttempts < maxNumberOfAttempts) {
    mountAndBackup();
  }
}

function main() {
  if (backupRequired()) {
    doBackupJob();
  }
}

main();
