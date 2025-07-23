---
url: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
title: Create speech with timing | ElevenLabs Documentation
access_date: 2025-07-23T22:44:29.000Z
current_date: 2025-07-23T22:44:29.200Z
---

DocsConversational AIAPI reference

* API REFERENCE  
   * Introduction  
   * Authentication  
   * Streaming
* ENDPOINTS  
   * Text to Speech  
   * Speech to Text  
   * Text to Dialogue  
   * Voice Changer  
   * Sound Effects  
   * Audio Isolation  
   * Text to Voice  
   * Dubbing  
   * Audio Native  
   * Voices  
   * Forced Alignment
* ADMINISTRATION  
   * History  
   * Models  
   * Studio  
   * Pronunciation Dictionaries  
   * Samples  
   * Usage  
   * User  
   * Voice Library  
   * Workspace  
   * Webhooks
* CONVERSATIONAL AI  
   * Agents  
   * Conversations  
   * Tools  
   * Knowledge Base  
   * Phone Numbers  
   * Widget  
   * Workspace  
   * SIP Trunk  
   * Twilio  
   * Batch Calling  
   * LLM Usage  
   * MCP
* LEGACY  
   * Voices  
   * Knowledge Base

CommunityBlogHelp CenterAPI PricingSign up

Light

ENDPOINTSText to Speech

# Create speech with timing

POST

/v1/text-to-speech/:voice\_id/with-timestamps

Python

`| 1 | from elevenlabs import ElevenLabs                 |
| - | ------------------------------------------------- |
| 2 |                                                   |
| 3 | client = ElevenLabs(                              |
| 4 | api_key="YOUR_API_KEY",                           |
| 5 | )                                                 |
| 6 | client.text_to_speech.convert_with_timestamps(    |
| 7 | voice_id="21m00Tcm4TlvDq8ikWAM",                  |
| 8 | text="This is a test for the API of ElevenLabs.", |
| 9 | )                                                 |

`

Try it

200Successful

`| 1  | {                                              |
| -- | ---------------------------------------------- |
| 2  | "audio_base64": "base64_encoded_audio_string", |
| 3  | "alignment": {                                 |
| 4  | "characters": [                                |
| 5  | "H",                                           |
| 6  | "e",                                           |
| 7  | "l",                                           |
| 8  | "l",                                           |
| 9  | "o"                                            |
| 10 | ],                                             |
| 11 | "character_start_times_seconds": [             |
| 12 | 0,                                             |
| 13 | 0.1,                                           |
| 14 | 0.2,                                           |
| 15 | 0.3,                                           |
| 16 | 0.4                                            |
| 17 | ],                                             |
| 18 | "character_end_times_seconds": [               |
| 19 | 0.1,                                           |
| 20 | 0.2,                                           |
| 21 | 0.3,                                           |
| 22 | 0.4,                                           |
| 23 | 0.5                                            |
| 24 | ]                                              |
| 25 | },                                             |
| 26 | "normalized_alignment": {                      |
| 27 | "characters": [                                |
| 28 | "H",                                           |
| 29 | "e",                                           |
| 30 | "l",                                           |
| 31 | "l",                                           |
| 32 | "o"                                            |
| 33 | ],                                             |
| 34 | "character_start_times_seconds": [             |
| 35 | 0,                                             |
| 36 | 0.1,                                           |
| 37 | 0.2,                                           |
| 38 | 0.3,                                           |
| 39 | 0.4                                            |
| 40 | ],                                             |
| 41 | "character_end_times_seconds": [               |
| 42 | 0.1,                                           |
| 43 | 0.2,                                           |
| 44 | 0.3,                                           |
| 45 | 0.4,                                           |
| 46 | 0.5                                            |
| 47 | ]                                              |
| 48 | }                                              |
| 49 | }                                              |

`

Generate speech from text with precise character-level timing information for audio-text synchronization.

### Path parameters

voice\_idstringRequired

Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.

### Headers

xi-api-keystringRequired

### Query parameters

enable\_loggingbooleanOptionalDefaults to `true`

When enable\_logging is set to false zero retention mode will be used for the request. This will mean history features are unavailable for this request, including request stitching. Zero retention mode may only be used by enterprise customers.

optimize\_streaming\_latencyinteger or nullOptionalDeprecated

You can turn on latency optimizations at some cost of quality. The best possible final latency varies by model. Possible values: 0 - default mode (no latency optimizations) 1 - normal latency optimizations (about 50% of possible latency improvement of option 3) 2 - strong latency optimizations (about 75% of possible latency improvement of option 3) 3 - max latency optimizations 4 - max latency optimizations, but also with text normalizer turned off for even more latency savings (best latency, but can mispronounce eg numbers and dates).

Defaults to None.

output\_formatenumOptionalDefaults to `mp3_44100_128`

Output format of the generated audio. Formatted as codec\_sample\_rate\_bitrate. So an mp3 with 22.05kHz sample rate at 32kbs is represented as mp3\_22050\_32\. MP3 with 192kbps bitrate requires you to be subscribed to Creator tier or above. PCM with 44.1kHz sample rate requires you to be subscribed to Pro tier or above. Note that the μ-law format (sometimes written mu-law, often approximated as u-law) is commonly used for Twilio audio inputs.

Show 19 enum values

### Request

This endpoint expects an object.

textstringRequired

The text that will get converted into speech.

model\_idstringOptionalDefaults to `eleven_multilingual_v2`

Identifier of the model that will be used, you can query them using GET /v1/models. The model needs to have support for text to speech, you can check this using the can\_do\_text\_to\_speech property.

language\_codestring or nullOptional

Language code (ISO 639-1) used to enforce a language for the model. Currently only Turbo v2.5 and Flash v2.5 support language enforcement. For other models, an error will be returned if language code is provided.

voice\_settingsobject or nullOptional

Voice settings overriding stored settings for the given voice. They are applied only on the given request.

Show 5 properties

pronunciation\_dictionary\_locatorslist of objectsOptional

A list of pronunciation dictionary locators (id, version\_id) to be applied to the text. They will be applied in order. You may have up to 3 locators per request

Show 2 properties

seedinteger or nullOptional

If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed. Must be integer between 0 and 4294967295.

previous\_textstring or nullOptional

The text that came before the text of the current request. Can be used to improve the speech's continuity when concatenating together multiple generations or to influence the speech's continuity in the current generation.

next\_textstring or nullOptional

The text that comes after the text of the current request. Can be used to improve the speech's continuity when concatenating together multiple generations or to influence the speech's continuity in the current generation.

previous\_request\_idslist of stringsOptional

A list of request\_id of the samples that were generated before this generation. Can be used to improve the speech’s continuity when splitting up a large task into multiple requests. The results will be best when the same model is used across the generations. In case both previous\_text and previous\_request\_ids is send, previous\_text will be ignored. A maximum of 3 request\_ids can be send.

next\_request\_idslist of stringsOptional

A list of request\_id of the samples that come after this generation. next\_request\_ids is especially useful for maintaining the speech’s continuity when regenerating a sample that has had some audio quality issues. For example, if you have generated 3 speech clips, and you want to improve clip 2, passing the request id of clip 3 as a next\_request\_id (and that of clip 1 as a previous\_request\_id) will help maintain natural flow in the combined speech. The results will be best when the same model is used across the generations. In case both next\_text and next\_request\_ids is send, next\_text will be ignored. A maximum of 3 request\_ids can be send.

apply\_text\_normalizationenumOptionalDefaults to `auto`

This parameter controls text normalization with three modes: ‘auto’, ‘on’, and ‘off’. When set to ‘auto’, the system will automatically decide whether to apply text normalization (e.g., spelling out numbers). With ‘on’, text normalization will always be applied, while with ‘off’, it will be skipped. Cannot be turned on for ‘eleven\_turbo\_v2\_5’ or ‘eleven\_flash\_v2\_5’ models.

Allowed values:autoonoff

apply\_language\_text\_normalizationbooleanOptionalDefaults to `false`

This parameter controls language text normalization. This helps with proper pronunciation of text in some supported languages. WARNING: This parameter can heavily increase the latency of the request. Currently only supported for Japanese.

use\_pvc\_as\_ivcbooleanOptionalDefaults to `false`Deprecated

If true, we won't use PVC version of the voice for the generation but the IVC version. This is a temporary workaround for higher latency in PVC versions.

### Response

Successful Response

audio\_base64string

Base64 encoded audio data

alignmentobject or null

Timestamp information for each character in the original text

Show 3 properties

normalized\_alignmentobject or null

Timestamp information for each character in the normalized text

### Errors

422

Unprocessable Entity Error