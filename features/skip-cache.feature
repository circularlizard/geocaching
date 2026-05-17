Feature: Skip Cache Flow
  As a team that cannot find a cache after requesting all three clues
  I want to declare I cannot find it and move on
  So that I can continue the game without being permanently blocked

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game that has not yet reached its end time
    And team "The Finders" is registered and on cache 1 of their sequence
    And team "The Finders" has already requested Clue 3 for cache 1

  Scenario: Cannot find cache button is visible after Clue 3 is requested
    When a user visits the clue page for team "The Finders"
    Then they see a "Cannot find cache" button

  Scenario: Clicking cannot find cache shows an are-you-sure confirmation prompt
    Given a user is on the clue page for team "The Finders"
    When they click "Cannot find cache"
    Then they see an "Are you sure?" confirmation prompt
    And they see options to confirm or cancel

  Scenario: Cancelling the skip returns the team to the clue page unchanged
    Given a user has clicked "Cannot find cache" and the confirmation prompt is showing
    When they click "Cancel"
    Then they remain on the clue page for cache 1
    And the progress log for cache 1 is unchanged

  Scenario: Confirming the skip records 0 points and advances the team
    Given a user has clicked "Cannot find cache" and the confirmation prompt is showing
    When they click "Confirm"
    Then 0 points are recorded for cache 1 in the progress log
    And the skipped status is set to true for cache 1
    And the team's current cache index advances to cache 2
    And they are redirected to the clue page showing Clue 1 for cache 2

  Scenario: Skipping the final cache redirects to the completion page
    Given team "The Finders" is on their last cache in the sequence
    And team "The Finders" has already requested Clue 3 for the last cache
    And a user has clicked "Cannot find cache" and the confirmation prompt is showing
    When they click "Confirm"
    Then 0 points are recorded for the last cache
    And they are redirected to the completion page for team "The Finders"

  Scenario: Cannot find cache button is not visible before Clue 3 is requested
    Given a new team "Late Starters" is on cache 1 and has only requested Clue 1
    When a user visits the clue page for team "Late Starters"
    Then they do not see a "Cannot find cache" button

  Scenario: Cannot find cache button is not visible when only Clue 2 has been requested
    Given a new team "Late Starters" is on cache 1 and has requested Clue 2 but not Clue 3
    When a user visits the clue page for team "Late Starters"
    Then they do not see a "Cannot find cache" button
