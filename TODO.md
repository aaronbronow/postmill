# TODO
- [ ] write readme

## Windmill UI
- [ ] req: an alert popup 
- [ ] req: sorting the images updates the drafts file
- [ ] req: saving the description updates the draft
- [x] req: Master-Detail view for drafts (Table for selection, List for images)
- [x] req: port write file method into bg to create or read windmill.json (Implemented via saveDrafts/loadDrafts)
- [ ] req: save post platform and account to draft file
- [x] req: delete draft
- [x] upload multiple files
- [x] make a second tab in the flow
- [x] list of accounts to post to
- [x] how to use app context?
- [x] how to set environment variables once (Configured in .env and AGENTS.md)
- [ ] set app state properties
- [x] clean up dev UI into a single column
- [ ] drag images to re-order
- [ ] delete the images and start over
- [ ] json encode description 

## AWS client
- [x] req: adding images uploades to aws and adds them to the current draft (Implemented via Create Draft button)
- [x] req: on load, read windmill.json which has empty array of drafts or drafts
- [x] req: windmill.json should have a list of the image files so no need for ss3:ListBucket policy
- [x] req: windmill.json should have full URL to each image and the description
- [x] new function to read a simple db file from aws (Implemented via loadDrafts)
- [x] stub out draft file method
- [x] parse the drafts file and return posts
- [x] create the drafts file if not exists
- [x] delete draft (and related files)

## Windmill Client
- [x] req: get storage resource (Verified in S3 resource config)
- [ ] req: migrate user-scoped S3 resource (u/aaron/post-photos-app-bucket-dev) to folder-scoped (f/public/) for consistent referencing and local sync
- [ ] req: get platform logins
- [ ] req: use datatable for storing platforms list
