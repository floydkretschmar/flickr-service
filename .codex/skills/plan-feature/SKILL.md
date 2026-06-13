---
name: plan-feature
description: Plan a new feature through user interview, codebase exploration, and module design, then create a spec. Use when user wants to write a spec, create a product requirements document, or plan a new feature.
---

This skill will be invoked when the user wants to create plan a feature. 

1. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions. This may be skipped if the user has already provided a detailed description of the problem and potential solutions. 

2. **Do the following tasks in parallel using new subagents with fresh context**
2a. Explore the repo to verify their assertions and understand the current state of the codebase.
2b. Use websearch if the user references external information, such as products, webpages or design patterns, that you are not familiar with. 

3. Conduct an exhaustive interview with the user about every aspect of this plan until you reach a shared understanding. ASK ONE QUESTION AT A TIME. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. Be critical and deeply interrogate every unspoken assumption. 

4. Task three separate new software_architect in parallel to come up with RADICALLY different approaches for implementation in parallel:

Have each subagent sketch out the major modules you will need to build or modify to complete the implementation. Actively look for opportunities to extract [deep modules](../../../docs/EXECUTION.md#deep-modules) that can be tested in isolation.

5. Compare and critically analyze the three approaches. Synthesize a single approach that combines the best aspects of all of them. Check with the user that these modules and approach match their expectations.

6. Once you have a complete understanding of the problem and solution write the spec file `docs/specs/YYYY-MM-DD-<feature-name>.md` using the template [spec-template.md](spec-template.md).

7. Have the spec reviewed by business_analyst to ensure alignment with the user interview and decisions