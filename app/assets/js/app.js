// PouchDB.destroy('donethat');
var db = new PouchDB('donethat');
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

  var sumByProjectAndTask = {
    _id: '_design/sumByProjectAndTask',
    views: {
      'sumByProjectAndTask':{
        map: function(doc){
          if(doc.type == 'task'){
            var d = new Date(doc._id);
            emit([d.getFullYear(), d.getMonth() + 1, d.getDate(), doc.project, doc.task], doc.timeInHours)
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
  $rootScope.$on('appReady', loadData);
  $scope.todaysTasks = [];

  //watch functions
  window.onbeforeunload = function() {
    if($scope.task) return 'You have unsaved changes!';
  }

  $rootScope.$on('$locationChangeSuccess', function(){
    $scope.today = $location.search().date || new Date();
    console.log('changingDate');
    loadData();
  });


  //action functions
  $scope.add = function() {
    if($scope.taskForm.$invalid) return;

    var started = new Date($scope.today);
    var ended = new Date($scope.today);
    started.setHours($scope.task.startTime.split(':')[0]);
    started.setMinutes($scope.task.startTime.split(':')[1]);
    started.setSeconds(0);
    ended.setHours($scope.task.endTime.split(':')[0]);
    ended.setMinutes($scope.task.endTime.split(':')[1]);
    ended.setSeconds(0);

    $scope.task._id = started.toJSON();
    $scope.task.type = 'task';
    $scope.task.started = started.toJSON();
    $scope.task.ended = ended.toJSON();
    $scope.task.timeInHours = calculateTime($scope.task.ended, $scope.task.started);

    db.put($scope.task).then(function(){
      loadData();
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
    db.remove(doc).then(loadData);
  }

  $scope.totalTimeSpent = function(){
    var totalTime = 0;

    $scope.todaysTasks.forEach(function(task){
     totalTime += task.timeInHours;
    });

    return totalTime;
  }

  $scope.changeDate = function(){
    $scope.changingDate = true;
    $scope.todayString = $filter('date')($scope.today, 'yyyy-MM-dd');
    setTimeout(function(){
      var element = document.getElementById('datepicker-input');
      element.focus();  
    }, 1);
  }

  $scope.setDate = function(date){
    $location.search('date', date);

  }

  //helper functions
  function loadData(){
    console.log('loading data...');
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

    db.query('sumByProjectAndTask',  { reduce: true, group_level: 5})
    .then(function(res){
      console.log(res);
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