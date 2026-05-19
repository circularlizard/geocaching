Feature: Active Clue Page
  As a registered team
  I want to view my current clue and request additional clues if needed
  So that I can navigate to the next geocache

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game that has not yet reached its end time
    And team "The Finders" is registered and on geocache 1 of their sequence
    And geocache 1 in their sequence has:
      | clue1 | Head towards the tallest oak tree         |
      | clue2 | Look under the large flat stone nearby    |
      | clue3 | See attached photo                        |
      | clue3_image | /fixtures/geocache1_photo.jpg          |

  Scenario: Clue page shows team name, current score and Clue 1
    When a user visits the clue page for team "The Finders"
    Then they see the team name "The Finders"
    And they see the current score
    And they see Clue 1 text "Head towards the tallest oak tree"
    And they do not see Clue 2
    And they do not see Clue 3
    And they do not see a "Cannot find geocache" button

  Scenario: Clue page shows the name of the geocache the team is looking for
    When a user visits the clue page for team "The Finders"
    Then they see the name of the current geocache on the page

  Scenario: Requesting Clue 2 reveals Clue 2 and records timestamp
    Given a user is on the clue page for team "The Finders"
    When they click "Request next clue"
    Then they see Clue 2 text "Look under the large flat stone nearby"
    And the clue2_requested_at timestamp is recorded for this geocache in the progress log
    And they do not see Clue 3
    And they do not see a "Cannot find geocache" button

  Scenario: Requesting Clue 3 reveals Clue 3 text and image and records timestamp
    Given team "The Finders" has already requested Clue 2 for their current geocache
    And a user is on the clue page for team "The Finders"
    When they click "Request next clue"
    Then they see Clue 3 text "See attached photo"
    And they see the Clue 3 image
    And the clue3_requested_at timestamp is recorded for this geocache in the progress log
    And they see a "Cannot find geocache" button

  Scenario: Cannot find geocache button is not shown before Clue 3 is requested
    Given team "The Finders" has already requested Clue 2 but not Clue 3
    When a user visits the clue page for team "The Finders"
    Then they do not see a "Cannot find geocache" button

  Scenario: Cannot find geocache button is shown after Clue 3 is requested
    Given team "The Finders" has already requested Clue 3 for their current geocache
    When a user visits the clue page for team "The Finders"
    Then they see a "Cannot find geocache" button

  Scenario: Clue 1 is shown again when the team advances to a new geocache
    Given team "The Finders" has just confirmed finding geocache 1 and advanced to geocache 2
    When a user visits the clue page for team "The Finders"
    Then they see Clue 1 for geocache 2
    And they do not see Clue 2
    And they do not see Clue 3

  Scenario: Clue page reflects current score accurately
    Given team "The Finders" has found 2 geocaches using 1 clue each (10 points total)
    When a user visits the clue page for team "The Finders"
    Then the displayed score is 10

  Scenario: Request next clue button is not shown when Clue 3 is already visible
    Given team "The Finders" has already requested Clue 3 for their current geocache
    When a user visits the clue page for team "The Finders"
    Then they do not see a "Request next clue" button

  Scenario: Clue page for game-over state informs team the game has ended
    Given the active game's end time has passed
    When a user visits the clue page for team "The Finders"
    Then they see a game-over message informing them the game has ended
