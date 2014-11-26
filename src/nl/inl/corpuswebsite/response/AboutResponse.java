/**
 *
 */
package nl.inl.corpuswebsite.response;

import nl.inl.corpuswebsite.BaseResponse;

/**
 *
 */
public class AboutResponse extends BaseResponse {

	/* (non-Javadoc)
	 * @see nl.inl.corpuswebsite.BaseResponse#completeRequest()
	 */
	@Override
	protected void completeRequest() {
		this.putFileContentIntoContext("content", this.servlet.getAboutPage(corpus));
		this.getContext().put("title", this.servlet.getConfig(corpus).getCorpusName());
		this.getContext().put("websiteconfig", this.servlet.getConfig(corpus));
		this.getContext().put("googleAnalyticsKey", this.servlet.getGoogleAnalyticsKey());
		this.displayHtmlTemplate(this.servlet.getTemplate("contentpage"));

	}

	/* (non-Javadoc)
	 * @see nl.inl.corpuswebsite.BaseResponse#logRequest()
	 */
	@Override
	protected void logRequest() {
		// TODO Auto-generated method stub

	}

	@Override
	public BaseResponse duplicate() {
		return new AboutResponse();
	}

}
