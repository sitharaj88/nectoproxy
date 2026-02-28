---
title: Annotations
description: Add notes, color codes, and tags to captured traffic entries in NectoProxy.
---

# Annotations

Annotations let you add **text notes**, **color codes**, and **tags** to any captured traffic entry in NectoProxy. Use annotations to mark important requests, leave context for yourself or teammates, organize findings during debugging sessions, and create a searchable record of your observations.

## Overview

Every entry in the NectoProxy traffic list can be annotated with:

- **Text notes** -- Free-form text describing your observation or findings
- **Color coding** -- A visual color applied to the traffic list row for quick identification
- **Tags** -- Short labels for categorization and filtering

Annotations are non-destructive -- they add metadata to traffic entries without modifying the original request or response data.

## Adding Annotations

### Text Notes

Add a text note to any traffic entry:

1. Select an entry in the traffic list
2. Open the **Annotations** panel (or right-click and select **Add Annotation**)
3. Type your note in the text field
4. Save the annotation

Notes can be any length and support plain text. Use them to record observations, hypotheses, or action items.

::: details Example Notes
| Entry | Note |
|---|---|
| `POST /api/auth/login` | "This request is sending credentials in plain text. Should use HTTPS." |
| `GET /api/products?page=2` | "Response takes 3.2s -- investigate database query performance." |
| `PUT /api/users/123` | "Returns 500 intermittently. Possibly a race condition with concurrent updates." |
| `GET /static/bundle.js` | "Bundle is 2.4 MB -- needs code splitting." |
:::

### Color Coding

Apply a color to a traffic entry's row in the traffic list. The colored row stands out visually, making it easy to spot marked entries when scrolling through a long list.

Available colors:

| Color | Hex | Common Usage |
|---|---|---|
| **Gray** | `#9E9E9E` | Neutral marking, low priority |
| **Red** | `#F44336` | Errors, bugs, critical issues |
| **Blue** | `#2196F3` | Informational, notable requests |
| **Green** | `#4CAF50` | Working correctly, verified good |
| **Yellow** | `#FFEB3B` | Warnings, needs attention |
| **Purple** | `#9C27B0` | Special cases, unique behavior |

To apply a color:

1. Right-click on an entry in the traffic list
2. Select **Set Color** from the context menu
3. Choose a color from the palette

::: tip
Establish a consistent color scheme within your team. For example, always use red for bugs, green for verified-correct behavior, yellow for items that need follow-up, and blue for informational observations. This makes annotated traffic lists readable at a glance by anyone on the team.
:::

### Tags

Tags are short text labels that you can attach to traffic entries for categorization. Unlike notes, tags are designed for quick filtering and grouping.

**Adding tags:**

1. Select an entry
2. Open the Annotations panel
3. Type a tag name and press Enter
4. Multiple tags can be added to a single entry

**Example tags:**

- `bug` -- Known bug
- `slow` -- Performance issue
- `auth` -- Authentication-related
- `reviewed` -- Already reviewed
- `follow-up` -- Needs further investigation
- `production` -- From production environment
- `regression` -- Behavioral change from previous version

## Timestamps

Every annotation is automatically **timestamped** with the date and time it was created. This provides a chronological record of your observations during a debugging session.

```
[2025-01-15 10:32:45] This response started returning 500 after the deployment.
[2025-01-15 10:35:12] Confirmed: the error is in the database migration.
[2025-01-15 10:48:30] Fix deployed. Response now returns 200 correctly.
```

Timestamps are particularly valuable when debugging time-sensitive issues or when annotating traffic over an extended session.

## Searching by Annotations

Annotations are **fully searchable** through NectoProxy's search functionality.

### Search by Note Content

Type note text into the search bar to find entries with matching annotations:

```
Search: "race condition"
Results: All entries with annotations containing "race condition"
```

### Search by Tag

Filter the traffic list by tag:

```
Filter: tag:bug
Results: All entries tagged with "bug"
```

### Search by Color

Filter by annotation color to see all entries marked with a specific color:

```
Filter: color:red
Results: All entries with a red color annotation
```

## Use Cases

### Marking Important Requests During Debugging

When investigating an issue, you often encounter specific requests that are significant. Instead of trying to remember them or noting line numbers externally, annotate them directly:

1. Find the request that triggers the bug
2. Color it **red** and add a note: "This is the failing request"
3. Find the last working request
4. Color it **green** and add a note: "Last request before failure"
5. Now you can easily navigate between the two marked entries

### Collaborative Debugging

When multiple team members are working on the same issue:

1. Export a session with annotations included
2. Share it with your teammate
3. Your teammate can see your notes, color codes, and tags
4. They can add their own annotations to build a shared understanding

### Categorizing Findings During Security Review

Use annotations to organize findings from a security review:

1. Review traffic entries one by one
2. Tag suspicious entries with `security` and color them **red**
3. Add notes describing the specific concern
4. Tag reviewed entries with `reviewed` and color them **green**
5. When finished, filter by `tag:security` to see all findings

::: details Example: Security Review Annotation Workflow
```
#42  GET /api/admin/users      [red] [security]
     Note: "No authentication check. Returns all user data including emails."

#67  POST /api/upload           [yellow] [security]
     Note: "Accepts any file type. No size limit. Check for path traversal."

#91  GET /api/config            [red] [security] [critical]
     Note: "Returns database credentials in response body."

#103 GET /api/products          [green] [reviewed]
     Note: "Proper authentication, pagination, no sensitive data."
```
:::

### Debugging Session Journal

Use annotations as a running journal during a debugging session:

1. Start investigating an issue
2. As you discover relevant requests, annotate them with your findings
3. The timestamps create a chronological record
4. When you find the root cause, annotate the decisive request
5. The annotated session serves as documentation of your debugging process

### Performance Analysis

Mark slow requests for follow-up optimization:

1. Sort the traffic list by duration
2. Tag the slowest requests with `slow`
3. Color them **yellow**
4. Add notes about why each one is slow (e.g., "Large payload," "Slow backend query," "Unnecessary redirect chain")
5. Filter by `tag:slow` to see all performance issues in one place

## Managing Annotations

### Editing Annotations

Click on an existing annotation to edit its text, change its color, or modify its tags. Changes are saved immediately.

### Removing Annotations

To remove an annotation:

1. Open the Annotations panel for the entry
2. Click the **Remove** button next to the annotation you want to delete
3. Confirm the deletion

### Annotations in Exports

Annotations are preserved when exporting sessions. When you share a session with annotations, the recipient sees all your notes, colors, and tags intact.

---

::: info
Annotations are stored with the session data. They are preserved across NectoProxy restarts as long as the session data is retained.
:::
