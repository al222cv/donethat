var db = new PouchDB('donethat');
var app = angular.module('donethat', []);

app.run(function (){
  var allProjectsView = {
    _id: '_design/allProjects',
    views: {
      'allProjects': {
        map: function(doc){
          if(doc.type == 'task')
            emit(doc.project, 1);
        }.toString(),
        reduce: function(){
          return '_sum'
        }.toString()
      }
    }
  };

  db.get('_design/allProjects')
  .then(function(doc){
    return db.remove(doc);
  })
  .then(function(){
    return db.put(allProjectsView);
  })
  .then(function(){
    return db.query('allProjects', {stale: 'update_after'});   
  })
 .then(function(){
    return db.query('allProjects',{reduce: true, group: true})
  })
 .then(function(res){
    console.log(res);
  }, function(err){console.log(err)});
});

app.controller('HomeCtrl', function($scope){
  $scope.add = function(){
    var started = new Date().toJSON();

    var doc = {
      _id: started,
      type: 'task',
      started: started,
      ended: new Date().toJSON(),
      project: 'PoseidonData',
      task: 'Organisation och affärsområde'
    };

    db.put(doc).then(function(res){
      console.log(res);
    }, function(err){
      console.log(err);
    });
  };
});
