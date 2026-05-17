Feature: Game Completion
  As a team that has found or skipped all caches
  I want to see a completion message with my final score
  So that I know to return to base and how well I did

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game

  Scenario: Completion page shows congratulatory message and final score after last cache found
    Given team "The Finders" has confirmed finding their last cache
    When the completion page for team "The Finders" is visited
    Then they see a congratulatory message
    And they see their final total score
    And they see a message to return to base

  Scenario: Completion page shows correct score after a mix of found and skipped caches
    Given team "The Finders" has the following cache results:
      | cache | clues_used | skipped |
      | 1     | 1          | false   |
      | 2     | 2          | false   |
      | 3     | 3          | false   |
      | 4     | 0          | true    |
      | 5     | 1          | false   |
      | 6     | 1          | false   |
      | 7     | 2          | false   |
      | 8     | 1          | false   |
    When the completion page for team "The Finders" is visited
    Then the final score displayed is 27

  Scenario: Two teams with identical scores are both shown as joint winners on the dashboard
    Given team "Alpha" has a final score of 20
    And team "Beta" has a final score of 20
    When the admin dashboard is viewed
    Then both "Alpha" and "Beta" are shown as joint winners with 20 points

  Scenario: Any registration token scan after game end time shows game-over page
    Given the active game's end time has passed
    And registration token "REG-TOKEN-01" exists and is unregistered in the current game
    When a user visits "/scan?id=REG-TOKEN-01"
    Then they see a game-over page informing them the game has ended

  Scenario: Any cache token scan after game end time shows game-over page
    Given the active game's end time has passed
    And a cache location token "CACHE-TOKEN-01" exists
    When a user visits "/scan?id=CACHE-TOKEN-01"
    Then they see a game-over page informing them the game has ended

  Scenario: Clue page shows game-over message after game end time
    Given the active game's end time has passed
    And team "The Finders" is in progress and not yet completed
    When a user visits the clue page for team "The Finders"
    Then they see a game-over message informing them the game has ended

  Scenario: Admin recall triggers game-over page on next scan
    Given admin recall has been triggered on the active game
    And a cache location token "CACHE-TOKEN-01" exists
    When a user visits "/scan?id=CACHE-TOKEN-01"
    Then they see a game-over page informing them the game has ended

  Scenario: Admin recall triggers game-over message on clue page reload
    Given admin recall has been triggered on the active game
    And team "The Finders" is in progress and not yet completed
    When a user visits the clue page for team "The Finders"
    Then they see a game-over message informing them the game has ended
