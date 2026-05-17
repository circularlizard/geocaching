Feature: Team Registration
  As a team scanning their registration QR code for the first time
  I want to register my team name and members
  So that I am assigned a unique cache sequence and can begin the game

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game with 8 caches
    And registration token "REG-TOKEN-01" has not been used in the active game

  Scenario: Successful team registration
    Given a user visits "/register?token=REG-TOKEN-01"
    When they submit the registration form with team name "The Finders" and members "Alice, Bob, Carol, Dave"
    Then a new team "The Finders" is created in the database linked to the active game
    And the team is assigned a unique randomised sequence of all 8 caches
    And they are redirected to the active clue page for team "The Finders"
    And the clue page shows Clue 1 for their first cache

  Scenario: Registration form is shown for an unregistered token
    When a user visits "/register?token=REG-TOKEN-01"
    Then they see a registration form requesting a team name and team members

  Scenario: Registration rejected with fewer than 4 members
    Given a user visits "/register?token=REG-TOKEN-01"
    When they submit the registration form with team name "Solo Squad" and members "Alice, Bob, Carol"
    Then they see a validation error indicating a minimum of 4 team members is required
    And no team is created in the database

  Scenario: Registration rejected with more than 8 members
    Given a user visits "/register?token=REG-TOKEN-01"
    When they submit the registration form with team name "Big Group" and members "A, B, C, D, E, F, G, H, I"
    Then they see a validation error indicating a maximum of 8 team members is allowed
    And no team is created in the database

  Scenario: Registration rejected with missing team name
    Given a user visits "/register?token=REG-TOKEN-01"
    When they submit the registration form with no team name and members "Alice, Bob, Carol, Dave"
    Then they see a validation error indicating a team name is required
    And no team is created in the database

  Scenario: Re-scanning a registered token bypasses registration form
    Given registration token "REG-TOKEN-02" has already been used to register team "The Wanderers" in the active game
    When a user visits "/register?token=REG-TOKEN-02"
    Then they are redirected to the active clue page for team "The Wanderers"
    And the registration form is not shown

  Scenario: Each team receives a unique cache sequence
    Given team "Alpha" is registered with token "REG-TOKEN-01"
    And team "Beta" is registered with token "REG-TOKEN-02"
    Then the cache sequence for team "Alpha" is not identical to the cache sequence for team "Beta"

  Scenario: Cache sequence contains all caches in the game exactly once
    When team "The Finders" is registered with token "REG-TOKEN-01"
    Then their cache sequence contains each of the 8 game caches exactly once

  Scenario: Registration token from a previous game triggers fresh registration in new game
    Given a new game has been created
    And registration token "REG-TOKEN-01" was used in a previous game but not in the new active game
    When a user visits "/register?token=REG-TOKEN-01"
    Then they see the registration form
    And a new team registration is created linked to the new active game
