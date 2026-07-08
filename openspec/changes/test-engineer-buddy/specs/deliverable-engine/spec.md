## ADDED Requirements

### Requirement: stage-prompt-generation
The system SHALL generate up to three stage instruction prompts when a stage reaches 100% progress, using filled slots to inject project context.

#### Scenario: prompts-generated-on-stage-complete
- **WHEN** the model returns stage_progress equal to 100 for a given stage
- **THEN** the system SHALL select eligible templates for that stage and domain
- **AND** SHALL populate slot placeholders in the template prompt
- **AND** SHALL append the generated prompts to deliverables.prompts

### Requirement: openspec-pack-generation
The system SHALL generate a compliant OpenSpec proposal package via the deliver scope (deepseek-v4-pro with thinking enabled) when the user requests it at the deliver stage.

#### Scenario: pack-contains-required-sections
- **WHEN** the user clicks "Generate OpenSpec Pack" at the deliver stage
- **THEN** the system SHALL call the proxy with scope=deliver
- **AND** the resulting pack SHALL contain change_id, proposal_md, tasks_md, and at least two capability specs

#### Scenario: spec-md-follows-openspec-format
- **WHEN** the pack is exported as a ZIP
- **THEN** each spec.md SHALL contain at minimum one "### Requirement:" section and one "#### Scenario:" section
- **AND** WHEN/THEN keywords SHALL be bold (**WHEN** / **THEN**)

### Requirement: zip-export
The system SHALL export the proposal pack as a ZIP file with the directory structure changes/<change-id>/proposal.md, tasks.md, and specs/<capability>/spec.md.

#### Scenario: zip-download-triggered
- **WHEN** the user clicks the export button on a proposal pack in the deck panel
- **THEN** the browser SHALL download a ZIP file named <change-id>.zip
- **AND** the ZIP SHALL contain the correct directory structure
