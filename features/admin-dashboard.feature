Feature: Admin Monitoring Dashboard
  As an administrator
  I want to monitor all teams in real time during the game
  So that I can track progress and recall teams if needed

  Background:
    Given the database is seeded with the standard test fixture
    And there is an active game
    And an admin is authenticated

  Scenario: Dashboard shows all registered teams
    Given the following teams are registered in the active game:
      | team name     | members                        |
      | The Finders   | Alice, Bob, Carol, Dave        |
      | The Wanderers | Eve, Frank, Grace, Henry       |
    When the admin visits "/admin/dashboard"
    Then they see "The Finders" listed on the dashboard
    And they see "The Wanderers" listed on the dashboard

  Scenario: Dashboard shows team members for each team
    Given team "The Finders" is registered with members "Alice, Bob, Carol, Dave"
    When the admin visits "/admin/dashboard"
    Then the entry for "The Finders" shows members "Alice, Bob, Carol, Dave"

  Scenario: Dashboard shows current cache progress for each team
    Given team "The Finders" has completed 3 caches and is currently on cache 4
    When the admin visits "/admin/dashboard"
    Then the entry for "The Finders" shows they are on cache 4 of 8

  Scenario: Dashboard shows current total score for each team
    Given team "The Finders" has a current score of 13
    When the admin visits "/admin/dashboard"
    Then the entry for "The Finders" shows a score of 13

  Scenario: Dashboard shows found timestamps for each completed cache
    Given team "The Finders" found cache 1 at "2026-04-15T10:15:00Z"
    And team "The Finders" found cache 2 at "2026-04-15T10:32:00Z"
    When the admin visits "/admin/dashboard"
    Then the entry for "The Finders" shows found timestamp "10:15" for cache 1
    And the entry for "The Finders" shows found timestamp "10:32" for cache 2

  Scenario: Dashboard shows skipped status for skipped caches
    Given team "The Finders" skipped cache 3
    When the admin visits "/admin/dashboard"
    Then the entry for "The Finders" shows cache 3 as skipped

  Scenario: Dashboard auto-refreshes without requiring a manual page reload
    When the admin is on the dashboard page
    Then the page refreshes its data automatically at regular intervals without a full page reload

  Scenario: Admin can trigger a recall of all teams
    Given the admin is on the dashboard
    When they click "Recall All Teams"
    Then they see an "Are you sure?" confirmation prompt

  Scenario: Admin confirms recall and all future scans show game-over
    Given the admin has clicked "Recall All Teams" and the confirmation prompt is showing
    When they confirm the recall
    Then the admin_recall_triggered flag is set to true on the active game
    And any subsequent QR scan by any team results in a game-over page

  Scenario: Admin cancels recall and no change is made
    Given the admin has clicked "Recall All Teams" and the confirmation prompt is showing
    When they click "Cancel"
    Then the admin_recall_triggered flag remains false
    And the game continues normally

  Scenario: Dashboard shows unregistered team slots
    Given the active game has 3 registration tokens and only 2 have been used to register teams
    When the admin visits "/admin/dashboard"
    Then they see 2 registered teams
    And they see 1 unregistered token slot

  Scenario: Dashboard is accessible only to authenticated admins
    Given a user is not authenticated as admin
    When they visit "/admin/dashboard"
    Then they are redirected to the admin login page
