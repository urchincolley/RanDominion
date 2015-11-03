function Utils($scope) {

  // Function to get a random element from an array.
  var randElement = function(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  //
  // Helpful functions for filtering.
  //

  var addsBuys = function(card) {
    return card.adds_buys;
  };

  var isFork = function(card) {
    return card.is_fork;
  };

  var isType = function(card, type) {
    return card.types.indexOf(type) > -1;
  };

  var isAttack = function(card) {
    return isType(card, 'attack');
  };

  var isReaction = function(card) {
    return isType(card, 'reaction');
  };

  var isLooter = function(card) {
    return isType(card, 'looter');
  };

  var isBane = function(card) {
    return card.cost === 2 || card.cost === 3;
  };

  var inSets = function(card) {
    return $scope.options.sets.indexOf(card.set) >= 0;
  };

  // Function to determine if a card passes all active exclusion rules.
  var inclusionFilter = function(card) {
    return (!$scope.options.excludeCurses || !card.uses_curses) &&
      (!$scope.options.excludeAttacks || !isAttack(card)) &&
      (!$scope.options.excludeLooters || !isLooter(card)) &&
      inSets(card);
  };

  //
  // Functions to check if individual rules are met by a set of cards.
  //

  // Checks simple exlusions.
  var satisfiesExclusions = function(cardSet) {
    return cardSet.length === cardSet.filter(inclusionFilter).length;
  };

  // Checks if the requirement that some card add buys is inactive or met.
  var satisfiesReqBuys = function(cardSet) {
    return !$scope.options.requireBuys || !!cardSet.filter(addsBuys).length;
  };

  // Checks if the requirement that some card fork actions is inactive or met.
  var satisfiesReqFork = function(cardSet) {
    return !$scope.options.requireFork || !!cardSet.filter(isFork).length;
  };

  // Checks if the requirement of reactions when actions are present is inactive or met.
  var satisfiesReqReactions = function(cardSet) {
    return !$scope.options.requireReactions ||
           !cardSet.filter(isAttack).length ||
           !!cardSet.filter(isReaction).length;
  };

  // Checks if the exlusion of reactions when actions are absent is inactive or met.
  var satisfiesExReactions = function(cardSet) {
    return !$scope.options.excludeReactions ||
           !!cardSet.filter(isAttack).length ||
           !cardSet.filter(isReaction).length;
  };

  // Function that determines if a set of cards is valid based on the
  // currently selected options. Consider empty sets valid.
  var validateSupply = function(cardSet) {
    return !cardSet.length ||
           satisfiesExclusions(cardSet) &&
           satisfiesReqBuys(cardSet) &&
           satisfiesReqFork(cardSet) &&
           satisfiesReqReactions(cardSet) &&
           satisfiesExReactions(cardSet)
  };

  // Function that finds a valid supply for the current set of constraints if possible.
  var generateSupply = function() {
    var availableCards = allCards.filter(inclusionFilter);

    // If available cards can't satisfy requireReactions by including a reaction
    // if an attack is randomly chosen, remove the attacks.
    if (!satisfiesReqReactions(availableCards)) {
      availableCards = availableCards.filter(function(card) { return !isAttack(card); });
    }

    // If available cards can't satisfy excludeReactions by including an attack
    // if a reaction is randomly chosen, remove the reactions.
    if (!satisfiesExReactions(availableCards)) {
      availableCards = availableCards.filter(function(card) { return !isReaction(card); });
    }

    var supplyCards = [];
    if ($scope.options.requireFork) {
      // If an action fork was required, select one at random.
      var actionForks = availableCards.filter(isFork);
      // If no action forks are available, the chosen options are impossible to satisfy.
      if (!actionForks.length) {
        return []
      }
      var selectedFork = randElement(actionForks);
      // Add to supply and remove from available cards.
      supplyCards.push(selectedFork);
      availableCards.splice(availableCards.indexOf(selectedFork), 1);
    }

    if (!satisfiesReqBuys(supplyCards)) {
      // If an card that adds buys was required and isn't yet present, select one at random.
      var buyAdders = availableCards.filter(addsBuys);
      // If no buy-adding cards are available, the chosen options are impossible to satisfy.
      if (!buyAdders.length) {
        return []
      }
      var selectedBuyAdder = randElement(buyAdders);
      // Add to supply and remove from available cards.
      supplyCards.push(selectedBuyAdder);
      availableCards.splice(availableCards.indexOf(selectedBuyAdder), 1);
    } 

    // Randomly fill the supply up to 9 cards.
    var to_pick = 9 - supplyCards.length;
    for (var i=0; i < to_pick; i++) {
      var pickedCard = randElement(availableCards);
      supplyCards.push(pickedCard);
      availableCards.splice(availableCards.indexOf(pickedCard), 1);
    }

    // Filter the available cards so that the attack/reaction rules
    // must be met by the final card chosen.
    if (!satisfiesExReactions(supplyCards)) {
      availableCards = availableCards.filter(isAttack);
    } else if (!satisfiesReqReactions(supplyCards)) {
      availableCards = availableCards.filter(isReaction);
    }

    // If no 10th card is available, the options are impossible to satisfy.
    if (!availableCards.length) {
      return []
    }

    // Add the 10th card.
    var tenthCard = randElement(availableCards);
    supplyCards.push(tenthCard);
    availableCards.splice(availableCards.indexOf(tenthCard), 1);

    // Check if Young Witch is in the supplyCards and choose a Bane if so.
    // Replace Young Witch if no valid Bane is available.
    var yw_index = -1;
    $.each(supplyCards, function(index, card) {
      if (card.name === 'Young Witch') {
        yw_index = index;
        return false;
      }
    });

    if (yw_index >= 0) {
      // Get the possible Bane cards for Young Witch.
      var availableBanes = availableCards.filter(isBane);
      if (!!availableBanes.length) {
        // Append a random bane to the end supplyCards.
        supplyCards.push(randElement(availableBanes));
      } else {
        // Replace Young Witch. The only rule this might break is excludeReactions.
        supplyCards.splice(yw_index, 1);
        if (!satisfiesExReactions(supplyCards)) {
          // There are other attacks in Cornucopia that don't meet any simple exclusions,
          // so there's always a way to restore validity if it breaks on Young Witch replacement.
          availableCards = availableCards.filter(isAttack);
        }
        supplyCards.push(randElement(availableCards));
      }
    }

    return supplyCards;
  };

  var getReplacement = function(clicked_index) {
    var validCards = allCards.filter(inclusionFilter);
    // Get all cards not currently in the supply and the 9 non-clicked cards.
    var availableCards = [];
    var remainingNine = [];
    var unavailableNames = $.map($scope.supply.cards, function(card) { return card.name; });
    if ($scope.supply.bane) unavailableNames.push($scope.supply.bane.name);
    $.each(validCards, function(_, valid_card) {
      var supply_index = unavailableNames.indexOf(valid_card.name);
      if (supply_index < 0) {
        availableCards.push(valid_card);
      } else if (supply_index !== clicked_index) {
        remainingNine.push(valid_card);
      }
    });

    // Based on current restrictions, find the set of potential replacements that would
    // maintain or restore supply validity.
    var validSubs = [];

    // If the remainingNine don't satisfy simple exclusions, validity is impossible.
    if (satisfiesExclusions(remainingNine)) {
      validSubs = $.extend(true, [], availableCards);
      if (!satisfiesReqFork(remainingNine)) {
        validSubs = validSubs.filter(isFork);
      }
      if (!satisfiesReqBuys(remainingNine)) {
        validSubs = validSubs.filter(addsBuys);
      }
      if (!satisfiesReqReactions(remainingNine)) {
        validSubs = validSubs.filter(isReaction);
      }
      if (!satisfiesExReactions(remainingNine)) {
        validSubs = validSubs.filter(isAttack);
      }
    }

    // Draw from validSubs if possible, otherwise from availableCards.
    var drawPool = !!validSubs.length ? validSubs : availableCards;
    var newCard = randElement(drawPool);

    if (newCard.name === 'Young Witch') {
      var availableBanes = drawPool.filter(isBane);
      if (!!availableBanes.length) {
        // If a banes were available, return Young Witch with a random bane.
        var bane = randElement(availableBanes);
        return [newCard, bane];
      } else {
        // If no banes were available, draw a different card.
        drawPool.splice(drawPool.indexOf(newCard), 1);
        newCard = randElement(drawPool);
      }
    }

    return [newCard];
    
  };

  var getNewBane = function() {
    var unavailableNames = $.map($scope.supply.cards, function(card) { return card.name; });
    unavailableNames.push($scope.supply.bane.name);
    var validBanes = allCards.filter(function(card) {
      return inclusionFilter(card) &&
             isBane(card) &&
             unavailableNames.indexOf(card.name) < 0 &&
             (!$scope.options.requireReactions ||
              !!$scope.supply.cards.filter(isReaction).length ||
              !isAttack(card)) &&
             (!$scope.options.excludeReactions ||
              !!$scope.supply.cards.filter(isAttack).length ||
              !isReaction(card));
    });
    return (!!validBanes.length) ? randElement(validBanes) : [];
  };

  var getEvents = function() {
    // If events are being used, and Adventures is included, and the supply is non-empty, select 0-2 random events.
    if ($scope.options.useEvents &&
        $scope.options.sets.indexOf('Adventures') > -1 &&
        !!$scope.supply.cards.length) {
      var num_events = Math.floor(Math.random() * 3);
      var eventSet = [];
      if (!!num_events) {
        var availableEvents = $.extend(true, [], allEvents);
        for (var i=0; i < num_events; i++) {
          var drawnEvent = randElement(availableEvents);
          eventSet.push(drawnEvent);
          availableEvents.splice(availableEvents.indexOf(drawnEvent), 1);
        }
      }
      return eventSet;
    } else {
      return null;
    }
  };

  var sortCards = function(cardSet, field) {
    // Sort cards primarily by field, then by name.
    return cardSet.sort(function(card1, card2) {
      return (card1[field] + card1.name) > (card2[field] + card2.name);
    });
  };

  return {
    validateSupply: validateSupply,
    generateSupply: generateSupply,
    getReplacement: getReplacement,
    getNewBane: getNewBane,
    getEvents: getEvents,
    sortCards: sortCards
  };

};
