var rdApp = angular.module('rdApp', ['checklist-model']);

  rdApp.filter('notInArray', function() {
    return function(array, value) {
      return array.indexOf(value) < 0;
    };
  });

}]);
