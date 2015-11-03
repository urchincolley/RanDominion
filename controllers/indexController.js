rdApp.controller("indexController", function($scope) {

  //
  // $scope initialization
  //

  $scope.supply = {
    'cards': [],
    'sortBy': 'cost',
    'currentlyValid': true
  }
  $scope.sets = [
    'Dominion (Base Set)',
    'Intrigue',
    'Seaside',
    'Alchemy',
    'Prosperity',
    'Cornucopia',
    'Hinterlands',
    'Dark Ages',
    'Guilds',
    'Adventures'
  ]
  $scope.options = {
    'sets': ['Dominion (Base Set)']
  };

  //
  // $scope functions for views.
  //
  var utils = Utils($scope);

  // Function called when the selected options change.
  $scope.options.change = function() {
    $scope.supply.currentlyValid = utils.validateSupply($scope.supply.cards);
    $scope.options.overconstrained = !utils.generateSupply().length;
  };

  // Function called when "Get Supply" button is clicked.
  $scope.get_supply = function() {
    var newSupply = utils.generateSupply();
    $scope.options.overconstrained = !newSupply.length;
    if (!!newSupply.length) {
      $scope.supply.currentlyValid = true;
      if (newSupply.length > 10) {
        // A bane card was included for Young Witch.
        $scope.supply.bane = newSupply.splice(10, 11)[0];
      } else {
        $scope.supply.bane = null;
      }
      $scope.supply.cards = utils.sortCards(newSupply, $scope.supply.sortBy);
    }
    $scope.supply.events = utils.getEvents();
  };

  // Function called when a card is clicked for replacement.
  $scope.replace_card = function(clickedCard) {
    // If Young Witch is being replaced, clear the bane.
    if (clickedCard.name === 'Young Witch') $scope.supply.bane = null;
    var clicked_index = $scope.supply.cards.indexOf(clickedCard);
    var newCards = utils.getReplacement(clicked_index);
    // Get the replacement.
    $scope.supply.cards.splice(clicked_index, 1, newCards[0]);
    // Check if a bane card was included for Young Witch.
    if (newCards.length === 2) $scope.supply.bane = newCards[1];
    // Recheck supply validity.
    $scope.supply.currentlyValid = utils.validateSupply($scope.supply.cards);
  };

  // Function called when a bane card is clicked for replacement.
  $scope.replace_bane = function() {
    var newBane = utils.getNewBane(); 
    if (newBane) $scope.supply.bane = newBane;
  };

  // Function to redraw the set of events when an event is clicked.
  $scope.draw_events = function() {
    $scope.supply.events = utils.getEvents();
  };

  // Function to sort the supply when a sort option is selected.
  // Note: we sort the model instead of using the orderBy directive so resorting isn't
  // automatic after a card is replaced, making the click-to-replace UI more natural.
  $scope.sort_supply = function(field) {
    $scope.supply.cards = utils.sortCards($scope.supply.cards, field);
  };

});
