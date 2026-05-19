Feature: Cache Found Flow
  As a team that has located a cache
  I want to scan the cache QR code, confirm I've replaced it, and receive my next clue
  So that I can continue the game and my score is recorded

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game that has not yet reached its end time
    And team "The Finders" is registered and on cache 1 of their sequence
    And cache 1 in their sequence has cache location token "CACHE-TOKEN-A1"
    And cache 2 in their sequence has cache location token "CACHE-TOKEN-A2"

  Scenario: Scanning the correct cache token shows the confirmation page and records found timestamp
    When a user visits "/found/CACHE-TOKEN-A1" for team "The Finders"
    Then they see a confirmation page saying the cache has been found
    And the found_at timestamp is recorded immediately in the progress log for cache 1
    And they are asked to confirm they have replaced the cache box

  Scenario: Confirming cache replaced with 1 clue used awards 5 points
    Given team "The Finders" has viewed only Clue 1 for cache 1
    And a user is on the confirmation page for cache 1
    When they confirm they have replaced the cache box
    Then 5 points are recorded for cache 1 in the progress log
    And the team's current cache index advances to cache 2
    And they are redirected to the clue page showing Clue 1 for cache 2

  Scenario: Confirming cache replaced with 2 clues used awards 3 points
    Given team "The Finders" has requested Clue 2 for cache 1
    And a user is on the confirmation page for cache 1
    When they confirm they have replaced the cache box
    Then 3 points are recorded for cache 1 in the progress log
    And the team's current cache index advances to cache 2

  Scenario: Confirming cache replaced with 3 clues used awards 1 point
    Given team "The Finders" has requested Clue 3 for cache 1
    And a user is on the confirmation page for cache 1
    When they confirm they have replaced the cache box
    Then 1 point is recorded for cache 1 in the progress log
    And the team's current cache index advances to cache 2

  Scenario: Scanning a cache that is not the team's current expected cache shows an error
    When a user visits "/found/CACHE-TOKEN-A2" for team "The Finders"
    Then they see an error message indicating this is not their next cache

  Scenario: Scanning the wrong cache with a team cookie set shows a helpful return link
    Given team "The Finders" has a team session cookie set
    When they scan cache token "CACHE-TOKEN-A2" which is not their current cache
    Then they see a link to return to their clue page

  Scenario: Scanning an unknown cache token shows an error
    When a user visits "/found/CACHE-TOKEN-UNKNOWN" for team "The Finders"
    Then they see an error page indicating the code is not recognised

  Scenario: Found timestamp is recorded at scan time not at confirmation time
    When a user visits "/found/CACHE-TOKEN-A1" for team "The Finders"
    Then the found_at timestamp is written to the progress log before the confirmation page is submitted

  Scenario: Scanning the same cache token a second time after confirmation shows an error
    Given team "The Finders" has already confirmed cache 1 and advanced to cache 2
    When a user visits "/found/CACHE-TOKEN-A1" again for team "The Finders"
    Then they see an error message indicating this cache has already been found

  Scenario: Confirming the final cache redirects to the completion page
    Given team "The Finders" is on their last cache in the sequence
    And a user is on the confirmation page for the last cache
    When they confirm they have replaced the cache box
    Then they are redirected to the completion page for team "The Finders"
