Feature: Admin Setup Interface
  As an administrator
  I want to set up and configure the game, caches, and QR codes
  So that the game can be run without technical intervention during the event

  Background:
    Given the database is seeded with the standard test fixture
    And the admin password is configured via the ADMIN_PASSWORD environment variable

  Scenario: Unauthenticated access to admin is redirected to login
    Given a user is not authenticated as admin
    When they visit "/admin"
    Then they are redirected to the admin login page

  Scenario: Correct admin password grants access
    Given a user visits the admin login page
    When they submit the correct admin password
    Then they are granted access to the admin interface
    And a session cookie is set

  Scenario: Incorrect admin password is rejected
    Given a user visits the admin login page
    When they submit an incorrect password
    Then they see an authentication error
    And they are not granted access

  Scenario: Admin can create a new game
    Given an admin is authenticated
    When they create a game with name "Spring Hunt 2026", end time "2026-04-15T15:00:00Z", and cache count 8
    Then a new game record is created in the database
    And the new game is marked as active
    And any previously active game is marked as inactive

  Scenario: Admin can edit the game end time
    Given an admin is authenticated
    And there is an active game named "Spring Hunt 2026"
    When they update the game end time to "2026-04-15T16:00:00Z"
    Then the active game's end time is updated in the database

  Scenario: Admin can create a new cache with clues
    Given an admin is authenticated
    When they create a cache with:
      | name   | Oak Tree Cache                            |
      | clue1  | Head towards the tallest oak tree         |
      | clue2  | Look under the large flat stone nearby    |
      | clue3  | See the photo for the exact spot          |
    Then a new cache record is created in the database
    And a unique cache location token is generated for the cache

  Scenario: Admin can upload a Clue 3 image for a cache
    Given an admin is authenticated
    And a cache "Oak Tree Cache" exists
    When they upload an image file for the Clue 3 photograph
    Then the image is stored in blob storage
    And the cache record is updated with the image URL

  Scenario: Admin can edit clue text for an existing cache
    Given an admin is authenticated
    And a cache "Oak Tree Cache" exists with Clue 1 "Head towards the tallest oak tree"
    When they update Clue 1 to "Walk north until you see the large oak"
    Then the cache record is updated with the new Clue 1 text

  Scenario: Admin can view all existing registration tokens
    Given an admin is authenticated
    When they view the registration tokens page
    Then they see a list of all registration tokens in the system
    And each token shows its secure token value and whether it has been used in the active game

  Scenario: Admin can generate registration token QR codes as a downloadable print sheet
    Given an admin is authenticated
    And the active game has registration tokens "REG-TOKEN-01", "REG-TOKEN-02", "REG-TOKEN-03"
    When they request the QR code print sheet for the active game
    Then a downloadable image or PDF is generated containing a QR code for each token
    And each QR code encodes a URL in the format "[APP_URL]/scan?id=[token]"

  Scenario: Cache location tokens are generated once and do not change between games
    Given cache "Oak Tree Cache" was created in a previous game with token "CACHE-TOKEN-A1"
    When a new game is created
    Then the cache location token for "Oak Tree Cache" is still "CACHE-TOKEN-A1"

  Scenario: Admin can assign caches to the active game
    Given an admin is authenticated
    And there are 10 caches in the system
    When they assign 8 specific caches to the active game
    Then the active game's cache count is 8
    And only those 8 caches are used in team sequence generation
