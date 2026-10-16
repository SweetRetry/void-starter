# Feature map

| Feature                         | Coverage                                                                           | Read when                                                          |
| :------------------------------ | :--------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| [Articles](articles.md)         | Automated navigation and language smoke. TOC, footer and mobile checks are manual. | Changing blog content, routes or navigation.                       |
| [Composer](composer.md)         | Automated empty Chat and draft checks. Model selection is manual.                  | Changing Chat launch, composer or model picker.                    |
| [Answers and sessions](chat.md) | Requires connected AI. Not executed by smoke.                                      | Changing streaming, persistence, retry, stop or visitor ownership. |
| [Attachments](attachments.md)   | Requires connected AI and local R2. Not executed by smoke.                         | Changing file selection, upload, preview or download.              |

Select all affected entry points. Record unexecuted cases as gaps. Each feature file defines the expected user-visible result, including side effects where applicable.
