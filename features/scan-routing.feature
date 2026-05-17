Feature: QR Code Scan Routing
  As a player or admin
  When a QR code URL is scanned or visited
  The app must route to the correct destination based on the token type and game state

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game that has not yet reached its end time
    And admin recall has not been triggered

  Scenario: Unregistered registration token routes to registration page
    Given a registration token "REG-TOKEN-01" exists and has not been used in the active game
    When a user visits "/scan?id=REG-TOKEN-01"
    Then they are redirected to "/register?token=REG-TOKEN-01"

  Scenario: Registered registration token routes to active clue page
    Given a registration token "REG-TOKEN-02" exists and has already been used to register team "The Wanderers" in the active game
    When a user visits "/scan?id=REG-TOKEN-02"
    Then they are redirected to the active clue page for team "The Wanderers"

  Scenario: Cache location token routes to found page
    Given a cache location token "CACHE-TOKEN-01" exists and is associated with cache "Oak Tree"
    When a user visits "/scan?id=CACHE-TOKEN-01"
    Then they are redirected to "/found/CACHE-TOKEN-01"

  Scenario: Unknown token renders error page
    Given no token "UNKNOWN-XYZ" exists in the system
    When a user visits "/scan?id=UNKNOWN-XYZ"
    Then they see an error page indicating the code is not recognised

  Scenario: Missing token parameter renders error page
    When a user visits "/scan" with no id parameter
    Then they see an error page indicating the code is not recognised

  Scenario: Scan after game end time renders game-over page
    Given the active game's end time has passed
    And a registration token "REG-TOKEN-01" exists and has not been used in the active game
    When a user visits "/scan?id=REG-TOKEN-01"
    Then they see a game-over page informing them the game has ended

  Scenario: Scan after admin recall renders game-over page
    Given admin recall has been triggered on the active game
    And a registration token "REG-TOKEN-01" exists and has not been used in the active game
    When a user visits "/scan?id=REG-TOKEN-01"
    Then they see a game-over page informing them the game has ended

  Scenario: Cache scan after game end time renders game-over page
    Given the active game's end time has passed
    And a cache location token "CACHE-TOKEN-01" exists
    When a user visits "/scan?id=CACHE-TOKEN-01"
    Then they see a game-over page informing them the game has ended
