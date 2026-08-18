Please analyze the following speaker-attributed call transcript.
Accurately differentiate between individual speakers (e.g. identify Speaker A / Agent vs Speaker B / Customer),
and evaluate all 17 metrics in the qa_scorecard carefully based on the rules provided in the system prompt.

### Transcript to Analyze:
{transcript}

### Expected Output JSON Format & Parameters:
You MUST respond strictly with a valid JSON object matching the following structure and parameters:

```json
{
  "agent_name": "Rachel", // First name of the agent (e.g. Rachel, Chris, Martha) greeting the customer
  "call_summary": "Concise 3-4 sentence executive overview of the call.",
  "overall_sentiment": "POSITIVE / NEUTRAL / NEGATIVE / MIXED", 
  "understandability_percentage": 95, // Integer 0-100
  "knowledgeable_score": 9, // Integer 1-10
  "empathy_score": 8, // Integer 1-10
  "qa_scorecard": {
    "greeting_and_verification": "Yes / No / NA",
    "active_listening_and_empathy": "Yes / No / NA",
    "probing_questions": "Yes / No / NA",
    "validate_priority": "Yes / No / NA",
    "accurate_troubleshooting": "Yes / No / NA",
    "solution_accuracy": "Yes / No / NA",
    "valid_escalation": "Yes / No / NA",
    "use_of_knowledge_base": "Yes / No / NA",
    "critical_p1_compliance": "Yes / No / NA",
    "ticket_documentation": "Yes / No / NA",
    "time_entry_agreement": "Yes / No / NA",
    "ownership_of_incident": "Yes / No / NA",
    "communication_sla": "Yes / No / NA",
    "proper_closing_confirmation": "Yes / No / NA",
    "first_call_resolution": "Yes / No / NA",
    "thirty_minute_rule": "Yes / No / NA",
    "minimal_transfers_hold": "Yes / No / NA"
  },
  "speaker_intents": [
    {
      "speaker_label": "SPEAKER_00",
      "display_name": "Speaker A (Agent/Customer)",
      "primary_intent": "Primary intent of the speaker",
      "key_points": [
        "Point 1",
        "Point 2"
      ]
    },
    {
      "speaker_label": "SPEAKER_01",
      "display_name": "Speaker B (Agent/Customer)",
      "primary_intent": "Primary intent of the speaker",
      "key_points": [
        "Point 1",
        "Point 2"
      ]
    }
  ],
  "key_action_items": [
    "Action item description 1",
    "Action item description 2"
  ]
}
```

Ensure all keys listed above are present in the JSON response. Do not include markdown code block markers or conversational preamble. Return only the raw JSON.
