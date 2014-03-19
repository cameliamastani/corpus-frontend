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
		this.putFileContentIntoContext("content", this.servlet.getConfig().getAboutPage());
		this.getContext().put("title", this.servlet.getConfig().getCorpusName());
		this.getContext().put("websiteconfig", this.servlet.getConfig());
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