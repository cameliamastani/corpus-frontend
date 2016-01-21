/**
 *
 */
package nl.inl.corpuswebsite.response;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import nl.inl.corpuswebsite.BaseResponse;
import nl.inl.corpuswebsite.MainServlet;

/**
 *
 */
public class SingleResponse extends BaseResponse {

	@Override
	protected void completeRequest() {

		String corpusName = servlet.getConfig(corpus).getCorpusName();

		String corpusNameTop = corpusName.replaceAll("^(.+):(.+)$", "$2 ($1)");
		String corpusOwner = null;
		if (corpusName.contains(":"))
			corpusOwner = corpusName.replaceAll(":.+$", "");
		corpusName = corpusName.replaceAll("^.+:", "");

		getContext().put("blsUrl", servlet.getExternalWebserviceUrl(corpus));
		getContext().put("title", corpusNameTop);
		getContext().put("corpusOwner", corpusOwner);
		getContext().put("corpusName", corpusName);
		getContext().put("wordproperties",
				servlet.getConfig(corpus).getWordProperties());
		//getContext().put("websiteconfig", servlet.getConfig(corpus));
		//getContext().put("googleAnalyticsKey", servlet.getGoogleAnalyticsKey());

		// display template
		displayHtmlTemplate(servlet.getTemplate("single"));
	}

	@Override
	public void init(HttpServletRequest request, HttpServletResponse response,
			MainServlet servlet) {
		super.init(request, response, servlet);
	}

}