// PouchDB.destroy('donethat');
var db = new PouchDB('donethat');
db.replicate.to('https://larchii.cloudant.com/donethat', {continuous: true});
db.replicate.from('https://larchii.cloudant.com/donethat', {continuous: true});

var app = angular.module('donethat', []);

app.run(function($rootScope) {
  var allProjectsView = {
    _id: '_design/allProjects',
    views: {
      'allProjects': {
        map: function(doc) {
          if (doc.type == 'task')
            emit(doc.project);
        }.toString(),
        reduce: '_count'
      }
    }
  };

  var allTasksView = {
    _id: '_design/allTasks',
    views: {
      'allTasks': {
        map: function(doc) {
          if (doc.type == 'task')
            emit(doc.task);
        }.toString(),
        reduce: '_count'
      }
    }
  };

  var allProjectTasks = {
    _id: '_design/allProjectTasks',
    views: {
      'allProjectTasks': {
        map: function(doc) {
          if (doc.type == 'task')
            emit([doc.project, doc.task]);
        }.toString(),
        reduce: '_count'
      }
    }
  }

  var sumByProjectAndTask = {
    _id: '_design/sumByProjectAndTask',
    views: {
      'sumByProjectAndTask':{
        map: function(doc){
          if(doc.type == 'task'){
            var d = new Date(doc._id);
            emit([doc.project, doc.task, d.getFullYear(), d.getMonth() + 1, d.getDate()], doc.timeInHours);
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  }

  db.get('_design/allProjects')
  .then(function success(doc) {
    allProjectsView._rev = doc._rev;
    return db.put(allProjectsView);
  }, function error(){
    return db.put(allProjectsView);
  })
  .then(function() {
    return db.query('allProjects', { stale: 'update_after' });
  })
  .then(function() {
    return db.get('_design/allTasks');
  })
  .then(function success(doc) {
    allTasksView._rev = doc._rev;
    return db.put(allTasksView);
  }, function error(){
    return db.put(allTasksView);
  })
  .then(function() {
    return db.query('allTasks', { stale: 'update_after' });
  })
  .then(function() {
    return db.get('_design/allProjectTasks');
  })
  .then(function success(doc) {
    allProjectTasks._rev = doc._rev;
    return db.put(allProjectTasks);
  }, function error(){
    return db.put(allProjectTasks);
  })
  .then(function() {
    return db.query('allProjectTasks', { stale: 'update_after' });
  })
  .then(function() {
    return db.get('_design/sumByProjectAndTask');
  })
  .then(function success(doc) {
    sumByProjectAndTask._rev = doc._rev;
    return db.put(sumByProjectAndTask);
  }, function error(){
    return db.put(sumByProjectAndTask);
  })
  .then(function() {
    return db.query('sumByProjectAndTask', { stale: 'update_after' });
  })
  .then(function(){
    console.log('ready');
    $rootScope.$broadcast('appReady');
  })
  .catch(function(err){
    console.log(err);
  });
});

app.controller('HomeCtrl', function($scope, $rootScope, $filter, $location) {
  $scope.isReady = false;
  $rootScope.$on('appReady', function(){
    $scope.isReady = true;
    console.log('loading data...');
    loadData();
  });
  $scope.todaysTasks = [];

  //watch functions
  window.onbeforeunload = function() {
    if($scope.task) return 'You have unsaved changes!';
  }

  $rootScope.$on('$locationChangeSuccess', function(){
    $scope.today = $location.search().date ? new Date($location.search().date) : new Date();
    if($scope.isReady){
      loadData();
    }
  });

  //action functions
  $scope.add = function() {
    if($scope.taskForm.$invalid) return;

    var started = new Date($scope.today);
    var ended = new Date($scope.today);

    started.setHours($scope.task.startTime.getHours());
    started.setMinutes($scope.task.startTime.getMinutes());
    started.setSeconds(0);
    ended.setHours($scope.task.endTime.getHours());
    ended.setMinutes($scope.task.endTime.getMinutes());
    ended.setSeconds(0);

    $scope.task._id = started.toJSON();
    $scope.task.type = 'task';
    $scope.task.started = started.toJSON();
    $scope.task.ended = ended.toJSON();
    $scope.task.timeInHours = calculateTime($scope.task.ended, $scope.task.started);

    delete $scope.task.startTime;
    delete $scope.task.endTime;

    db.put($scope.task).then(function(){
      $rootScope.$broadcast('appReady');
      $scope.task = null;
      $scope.$apply();
    });

    function calculateTime(totime, fromtime) {
      fromtime = new Date(fromtime);
      totime = new Date(totime);

      var ms = totime.getTime() - fromtime.getTime();
      return ms / 1000 / 60 / 60;
    }
  };

  $scope.remove = function(doc){
    db.remove(doc).then(function(){
      $rootScope.$broadcast('appReady');
    });
  };

  $scope.totalTimeSpent = function(){
    var totalTime = 0;

    $scope.todaysTasks.forEach(function(task){
     totalTime += task.timeInHours;
    });

    return totalTime;
  };

  $scope.nextUnavailable = function(){
    if(!$scope.today) return false;
    var today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setDate(today.getDate() - 1);

    return $scope.today.getTime() >= today.getTime();
  };

  $scope.changeDate = function(days){
    var newDate = angular.copy($scope.today);
    newDate.setDate(newDate.getDate() + days);

    var year = newDate.getFullYear();
    var month = newDate.getMonth() + 1;
    var date = newDate.getDate();

    $location.search('date',  year + '-' + month + '-' + date);
  };

  //helper functions
  function loadData(){
    db.query('allProjects', { reduce: true, group: true})
    .then(function(res) {
      $scope.projects = res.rows.map(function(row) { return row.key; });
      $scope.$apply();
    })
    .catch(function(err){
      console.log(err);
    });

    db.query('allTasks', { reduce: true, group: true})
    .then(function(res) {
      $scope.tasks = res.rows.map(function(row) { return row.key; });
      $scope.$apply();
    })
    .catch(function(err){
      console.log(err);
    });

    var todayStart = new Date($scope.today);
    var todayEnd = new Date($scope.today);
    todayStart.setHours(0);
    todayStart.setMinutes(0);
    todayEnd.setHours(23);
    todayEnd.setMinutes(59);

    db.allDocs({startkey: todayStart.toJSON(), endkey: todayEnd.toJSON(), include_docs: true})
    .then(function(res){
      $scope.todaysTasks = res.rows.map(function(row){ return row.doc });
      $scope.$apply();
    });
  }
});

app.controller('ReportCtrl', function($scope){
  var date = new Date();
  $scope.startDate = new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
  $scope.endDate = date;  
  
  //watch functions
  $scope.$on('appReady', loadData);

  $scope.$watch('startDate', loadData);
  $scope.$watch('endDate', loadData);

  //action functions
  $scope.startDateChanged = function(){
    if($scope.startDate.getTime() > $scope.endDate.getTime())
      $scope.endDate = $scope.startDate;
  }

  $scope.endDateChanged = function(){
    if($scope.endDate.getTime() < $scope.startDate.getTime())
      $scope.startDate = $scope.endDate;
  }

  //helper functions
  function loadData(){
    $scope.stats = [];

    db.query('allProjectTasks', {reduce: true, group_level: 2})
    .then(function(res){
      var projectTasks = res.rows.map(function(row) { return row.key; });
      projectTasks.forEach(function(pt){
        db.query('sumByProjectAndTask',  { reduce: true, group_level: 5, startkey: [
            pt[0], 
            pt[1], 
            $scope.startDate.getFullYear(), 
            $scope.startDate.getMonth() + 1, 
            $scope.startDate.getDate()
          ], 
          endkey:[
            pt[0], 
            pt[1], 
            $scope.endDate.getFullYear(), 
            $scope.endDate.getMonth() + 1, 
            $scope.endDate.getDate()
          ]})
        .then(function(res){
          $scope.stats.push({
             name: res.rows[0].key[0] + ' - ' + res.rows[0].key[1],
             timeInHours: res.rows[0].value
          });
          $scope.$apply();
        });
      });
    });
  }
});

app.filter('minusTimeGetHours', function(){
  return function(totime, fromtime){
    fromtime = new Date(fromtime);
    totime = new Date(totime);

    var ms = totime.getTime() - fromtime.getTime();
    return ms / 1000 / 60 / 60;
  }
})