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
  .then(function(){
    console.log('ready');
    $rootScope.$broadcast('appReady');
  })
  .catch(function(err){
    console.log(err);
  });
});

app.controller('HomeCtrl', function($scope, $rootScope) {
  $rootScope.$on('appReady', loadData);

  //action functions
  $scope.add = function() {
    if($scope.taskForm.$invalid) return;

    var started = new Date();
    var ended = new Date();
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

    db.put($scope.task).then(function(){
      loadData();
      $scope.task = null;
      $scope.$apply();
    });
  };

  $scope.remove = function(doc){
    db.remove(doc).then(loadData);
  }

  //helper functions
  function loadData(){
    console.log('loading data...');
    db.query('allProjects', { reduce: true, group: true})
    .then(function(res) {
      console.log(res);
      $scope.projects = res.rows.map(function(row) { return row.key; });
      $scope.$apply();
    })
    .catch(function(err){
      console.log(err);
    });

    db.query('allTasks', { reduce: true, group: true})
    .then(function(res) {
      console.log(res);
      $scope.tasks = res.rows.map(function(row) { return row.key; });
      $scope.$apply();
    })
    .catch(function(err){
      console.log(err);
    });

    var todayStart = new Date();
    var todayEnd = new Date();
    todayStart.setHours(0);
    todayStart.setMinutes(0);
    todayEnd.setHours(23);
    todayEnd.setMinutes(59);

    db.allDocs({startkey: todayStart.toJSON(), endkey: todayEnd.toJSON(), include_docs: true})
    .then(function(res){
      console.log(res);
      $scope.todaysTasks = res.rows.map(function(row){ return row.doc });
      $scope.$apply();
    });
  }
});
