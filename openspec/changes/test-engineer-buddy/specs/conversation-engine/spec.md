## ADDED Requirements

### Requirement: five-stage-conversation
The system SHALL guide users through five sequential stages (discovery, scope, approach, plan, deliver) and enforce stage-gating until required slots are filled.

#### Scenario: stage-gate-blocks-advance
- **WHEN** the user attempts to advance from discovery to scope
- **AND** one or more required slots (product_one_liner, target_user, pain_point) remain empty
- **THEN** the system SHALL display the unfilled slots as gaps in the stage spine and prevent stage transition

#### Scenario: stage-advances-on-full-slots
- **WHEN** all required slots for the current stage are filled
- **THEN** the system SHALL mark the stage progress as 100 and allow advancing to the next stage

### Requirement: json-fault-tolerant-parsing
The system SHALL parse model output with four fallback strategies and MUST NOT white-screen on malformed JSON.

#### Scenario: model-returns-garbage
- **WHEN** the model returns a response that cannot be parsed as JSON by any strategy
- **THEN** the system SHALL display the raw text as the assistant message and render a text input control

#### Scenario: model-returns-fenced-json
- **WHEN** the model wraps JSON output in markdown code fences
- **THEN** the system SHALL strip the fences and parse the inner JSON successfully

### Requirement: frozen-system-prefix
The system SHALL freeze the system prompt at session creation and MUST NOT re-splice it across turns.

#### Scenario: cache-hit-on-second-turn
- **WHEN** the user sends a second message in the same session
- **THEN** the system prompt bytes SHALL be identical to the first turn, enabling DeepSeek prefix cache hits
