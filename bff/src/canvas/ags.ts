import { Provider as lti, IdToken } from "ltijs";

/**
 * Post a score back to Canvas using ltijs's built-in AGS helper.
 *
 * ltijs handles:
 *   - fetching an access token from Canvas
 *   - finding the correct lineitem for this resource link
 *   - formatting the Score object per the LTI-AGS spec
 */
export async function postScore(idToken: IdToken, scoreGiven: number, scoreMaximum: number): Promise<any> {
  // Creating Grade object
  const gradeObj = {
    userId: idToken.user, // needs to be a student on the course
    scoreGiven: scoreGiven,
    scoreMaximum: scoreMaximum,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded'
  }

  // Selecting linetItem ID
  let lineItemId = idToken.platformContext.endpoint.lineitem // Attempting to retrieve it from idtoken
  if (!lineItemId) {
    const response = await lti.Grade.getLineItems(idToken, { resourceLinkId: true })
    const lineItems = response.lineItems
    if (lineItems.length === 0) {
      // Creating line item if there is none
      console.log('Creating new line item')
      const newLineItem = {
        scoreMaximum: 100,
        label: 'Grade',
        tag: 'grade',
        resourceLinkId: idToken.platformContext.resource.id
      }
      console.log("NEW LINE ITEM");
      console.log(JSON.stringify(newLineItem));
      const lineItem = await lti.Grade.createLineItem(idToken, newLineItem)
      lineItemId = lineItem.id
    } else {
      console.log("FOUND LINE ITEM");
      console.log(JSON.stringify(lineItems[0]));

      lineItemId = lineItems[0].id
    }
  }
  console.log("GRADE OBJ");
  console.log(JSON.stringify(gradeObj));


  // Sending Grade
  return await lti.Grade.submitScore(idToken, lineItemId, gradeObj)
}
