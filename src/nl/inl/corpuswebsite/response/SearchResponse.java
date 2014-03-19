/**
 *
 */
package nl.inl.corpuswebsite.response;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import javax.xml.transform.TransformerException;

import nl.inl.corpuswebsite.BaseResponse;
import nl.inl.corpuswebsite.utils.FieldDescriptor;
import nl.inl.corpuswebsite.utils.QueryServiceHandler;
import nl.inl.corpuswebsite.utils.UrlParameterFactory;
import nl.inl.corpuswebsite.utils.XslTransformer;
import nl.inl.util.StringUtil;

/**
 *
 */
public class SearchResponse extends BaseResponse {

	private QueryServiceHandler webservice = null;
	private XslTransformer transformer = new XslTransformer();
	private StringBuilder builder = new StringBuilder();
	private String perHitResultStylesheet = null;
	private String perDocResultStylesheet = null;
	private String groupHitsResultStylesheet = null;
	private String groupDocsResultStylesheet = null;

	/* (non-Javadoc)
	* @see nl.inl.corpuswebsite.BaseResponse#completeRequest()
	*/
	@Override
	protected void completeRequest() {
		if(webservice == null)
			webservice = new QueryServiceHandler(this.servlet.getConfig().getWebserviceUrl() + "search", 1);

		this.clearContext();

		boolean getResults = false;
		// if the key is set we only have to look up results
		if(getParameter("key", "").length() > 0)
			getResults = true;

		if(this.request.getParameterMap().size() > 0) {
			// if any parameters are set, we'll try to interpret the search request
			int view = this.getParameter("view", 1);

			// if the user has only filled in document filters
			// switch to per doc view
			if(isFilterQueryOnly())
				view = 2;

			switch(view) {
				case 1:
					doPerHitSearch(getResults);
					break;
				case 2:
					doPerDocSearch(getResults);
					break;
				case 4:
					this.getContext().put("showCollocationResults", true);
					break;
				case 8:
					doGroupPerHitSearch(getResults);
					break;
				case 16:
					doGroupPerDocSearch(getResults);
					break;
			}
			this.getContext().put("view", view);
		}

		// put values back as they were
		this.getContext().put("querybox", getParameter("querybox", ""));
		this.getContext().put("tab", getParameter("tab", "#simple"));
		this.getContext().put("max", getParameter("max", 50));
		this.getContext().put("responseObject", this);

		this.getContext().put("title", this.servlet.getConfig().getCorpusName());
		this.getContext().put("wordproperties", this.servlet.getConfig().getWordProperties());
		this.getContext().put("websiteconfig", this.servlet.getConfig());

		// display template
		this.displayHtmlTemplate(this.servlet.getTemplate("search"));
	}

	private boolean isFilterQueryOnly() {
		boolean hasFilter = false;
		for(FieldDescriptor fd : this.servlet.getConfig().getFilterFields()) {
			String fieldName = fd.getSearchField();

			if(fd.getType().equalsIgnoreCase("date")) {
				if(this.getParameter(fieldName + "__from", "").length() > 0)
					hasFilter = true;

				if(this.getParameter(fieldName + "__to", "").length() > 0)
					hasFilter = true;

			} else if(this.getParameter(fieldName, "").length() > 0)
				hasFilter = true;
		}

		// if our query is empty and we have at least one filter value
		return (this.getQuery().length() <= 2) && hasFilter;
	}

	private void doPerHitSearch(boolean getResults) {
		String query = getQuery();

		// if we managed to create a query from user input
		if(query.length() > 2) {
			String lang = getLanguage();
			Integer max = this.getParameter("max", 50);
			Integer start = this.getParameter("start", 0);
			String sortBy = this.getParameter("sortBy", "");
			String sessionId = this.request.getSession().getId();
			String groupBy = this.getParameter("groupBy", "");
			String viewGroup = this.getParameter("viewGroup", "");
			String sort = this.getParameter("sortasc", "1");

			Map<String, String[]> parameters = UrlParameterFactory.getSearchParameters(query, 1, lang, max, start, groupBy, sortBy, sessionId, viewGroup, sort);

			parameters = addFilterParameters(parameters);

			try {
				if(perHitResultStylesheet == null)
					perHitResultStylesheet = getPerHitStylesheet(getResults);

				if(getResults) {
					webservice = new QueryServiceHandler(this.servlet.getConfig().getWebserviceUrl() + "result", 1);
					parameters.put("id", new String[]{this.getParameter("key", "")});
				}

				String xmlResult = webservice.makeRequest(parameters);

				setTransformerDisplayParameters(query);

				String htmlResult = transformer.transform(xmlResult, perHitResultStylesheet);
				this.getContext().put("searchResults", htmlResult);

			} catch (IOException e) {
				// if there's an error, do not cache it
				webservice.removeRequestFromCache(parameters);
				throw new RuntimeException(e);
			} catch (TransformerException e) {
				// if there is an error do not cache it
				webservice.removeRequestFromCache(parameters);
				throw new RuntimeException(e);
			}
		}
	}

	private void doPerDocSearch(boolean getResults) {
		// TODO: refactor doPerDocSearch and doPerHitSearch to remove duplicate code
		String query = getQuery();

		// if we managed to create a query from user input
		if(query.length() > 2 || isFilterQueryOnly()) {

			if(isFilterQueryOnly()) {
				query = "";
			}

			String lang = getLanguage();
			Integer max = this.getParameter("max", 50);
			Integer start = this.getParameter("start", 0);
			String sortBy = this.getParameter("sortBy", "");
			String sessionId = this.request.getSession().getId();
			String sort = this.getParameter("sortasc", "1");

			String groupBy = this.getParameter("groupBy", "");
			String viewGroup = this.getParameter("viewGroup", "");

			Map<String, String[]> parameters = UrlParameterFactory.getSearchParameters(query, 2, lang, max, start, groupBy, sortBy, sessionId, viewGroup, sort);

			parameters = addFilterParameters(parameters);

			try {
				if(perDocResultStylesheet == null)
					perDocResultStylesheet = getPerDocStylesheet(getResults);

				if(getResults) {
					webservice = new QueryServiceHandler(this.servlet.getConfig().getWebserviceUrl() + "result", 1);
					parameters.put("id", new String[]{this.getParameter("key", "")});
				}

				String xmlResult = webservice.makeRequest(parameters);

				setTransformerDisplayParameters(query);

				String htmlResult = transformer.transform(xmlResult, perDocResultStylesheet);
				this.getContext().put("searchResults", htmlResult);

			} catch (IOException e) {
				// if there's an error, do not cache it
				webservice.removeRequestFromCache(parameters);
				throw new RuntimeException(e);
			} catch (TransformerException e) {
				// if there's an error, do not cache it
				webservice.removeRequestFromCache(parameters);
				throw new RuntimeException(e);
			}
		}
	}

	private void doGroupPerHitSearch(boolean getResults) {
		// TODO: refactor doPerDocSearch and doPerHitSearch to remove duplicate code
		String query = getQuery();

		// if we managed to create a query from user input
		if(query.length() > 2) {
			String lang = getLanguage();
			Integer max = this.getParameter("max", 50);
			Integer start = this.getParameter("start", 0);
			String sortBy = this.getParameter("sortBy", "");
			String sessionId = this.request.getSession().getId();
			String sort = this.getParameter("sortasc", "1");

			String groupBy = this.getParameter("groupBy", "");

			if(groupBy.length() > 0) {
				// if we're searching by year, automatically sort chronologically
				if(sortBy.length() == 0) {
					if(groupBy.equalsIgnoreCase(this.servlet.getConfig().getFieldIndexForFunction("date")))
						sortBy = "title";
					else
						sortBy = "hits";
				}

				Map<String, String[]> parameters = UrlParameterFactory.getSearchParameters(query, 8, lang, max, start, groupBy, sortBy, sessionId, null, sort);

				parameters = addFilterParameters(parameters);

				try {
					if(groupHitsResultStylesheet == null)
						groupHitsResultStylesheet = getGroupHitsStylesheet(getResults);

					if(getResults) {
						webservice = new QueryServiceHandler(this.servlet.getConfig().getWebserviceUrl() + "result", 1);
						parameters.put("id", new String[]{this.getParameter("key", "")});
					}

					String xmlResult = webservice.makeRequest(parameters);

					setTransformerDisplayParameters(query);

					transformer.addParameter("groupBy_name", groupBy);

					String htmlResult = transformer.transform(xmlResult, groupHitsResultStylesheet);
					this.getContext().put("searchResults", htmlResult);

				} catch (IOException e) {
					// if there's an error, do not cache it
					webservice.removeRequestFromCache(parameters);
					throw new RuntimeException(e);
				} catch (TransformerException e) {
					// if there's an error, do not cache it
					webservice.removeRequestFromCache(parameters);
					throw new RuntimeException(e);
				}
			} else {
				//not the most elegant way but it works: display just a grouping selection drop down
				String withoutview = "?" + getUrlParameterStringExcept("view");
				String htmlResult = "<div class=\"span12 contentbox\" id=\"results\"><ul class=\"nav nav-tabs\" id=\"contentTabs\"><li><a href=\"" + withoutview +
				"view=1\">Per Hit</a></li><li><a href=\"" + withoutview +
				"view=2\">Per Document</a></li><li class=\"active\"><a href=\"" + withoutview +
				"view=8\">Hits grouped</a></li><li><a href=\"" + withoutview +
				"view=16\">Documents grouped</a></li></ul><select class=\"input\" name=\"groupBy\" onchange=\"document.searchform.submit();\"><option value=\"\" disabled=\"true\" selected=\"true\">Group hits by...</option><option value=\""+ servlet.getConfig().getFieldIndexForFunction("title") + "\">Group by document title</option><option value=\"hittext\">Group by hit text</option><option value=\""+ servlet.getConfig().getPropertyForFunction("lemma") + "\">Group by lemma</option><option value=\""+ servlet.getConfig().getPropertyForFunction("pos") + "\">Group by hit pos</option><option value=\"lemmapos\">Group by lemma and PoS</option><option value=\"wordleft\">Group by word left</option><option value=\"wordright\">Group by word right</option><option value=\"" + servlet.getConfig().getFieldIndexForFunction("date") + "\">Group by year</option><option value=\"decade\" disabled=\"true\">Group by decade</option></select></div>";
				this.getContext().put("searchResults", htmlResult);
			}
		}
	}

	private void doGroupPerDocSearch(boolean getResults) {
		// TODO: refactor doPerDocSearch and doPerHitSearch to remove duplicate code
		String query = getQuery();

		// if we managed to create a query from user input
		if(query.length() > 2) {
			String lang = getLanguage();
			Integer max = this.getParameter("max", 50);
			Integer start = this.getParameter("start", 0);
			String sortBy = this.getParameter("sortBy", "");
			String groupBy = this.getParameter("groupBy", "");
			String sessionId = this.request.getSession().getId();
			String sort = this.getParameter("sortasc", "1");

			if(groupBy.length() > 0) {

				// if we're searching by year, automatically sort chronologically
				if(sortBy.length() == 0) {
					if(groupBy.equalsIgnoreCase(this.servlet.getConfig().getFieldIndexForFunction("date")))
						sortBy = "title";
					else
						sortBy = "hits";
				}

				Map<String, String[]> parameters = UrlParameterFactory.getSearchParameters(query, 16, lang, max, start, groupBy, sortBy, sessionId, null, sort);

				parameters = addFilterParameters(parameters);

				try {
					if(groupDocsResultStylesheet == null)
						groupDocsResultStylesheet = getGroupDocsStylesheet(getResults);

					if(getResults) {
						webservice = new QueryServiceHandler(this.servlet.getConfig().getWebserviceUrl() + "result", 1);
						parameters.put("id", new String[]{this.getParameter("key", "")});
					}

					String xmlResult = webservice.makeRequest(parameters);

					setTransformerDisplayParameters(query);

					transformer.addParameter("groupBy_name", groupBy);

					String htmlResult = transformer.transform(xmlResult, groupDocsResultStylesheet);
					this.getContext().put("searchResults", htmlResult);

				} catch (IOException e) {
					// if there's an error, do not cache it
					webservice.removeRequestFromCache(parameters);
					throw new RuntimeException(e);
				} catch (TransformerException e) {
					// if there's an error, do not cache it
					webservice.removeRequestFromCache(parameters);
					throw new RuntimeException(e);
				}
			} else {
				//not the most elegant way but it works: display just a grouping selection drop down
				String withoutview = "?" + getUrlParameterStringExcept("view");
				String htmlResult = "<div class=\"span12 contentbox\" id=\"results\"><ul class=\"nav nav-tabs\" id=\"contentTabs\"><li><a href=\"" + withoutview +
				"view=1\">Per Hit</a></li><li><a href=\"" + withoutview +
				"view=2\">Per Document</a></li><li><a href=\"" + withoutview +
				"view=8\">Hits grouped</a></li><li class=\"active\"><a href=\"" + withoutview +
				"view=16\">Documents grouped</a></li></ul><select class=\"input\" name=\"groupBy\" onchange=\"document.searchform.submit();\"><option value=\"\" disabled=\"true\" selected=\"true\">Group documents by...</option><option value=\"hits\">Group by number of hits</option><option value=\"" + servlet.getConfig().getFieldIndexForFunction("date") + "\">Group by year</option><option value=\"decade\" disabled=\"true\">Group by decade</option><option value=\""+ servlet.getConfig().getFieldIndexForFunction("author") + "\">Group by author</option></select></div>";
				this.getContext().put("searchResults", htmlResult);
			}
		}
	}

	private void setTransformerDisplayParameters(String query) throws UnsupportedEncodingException {
		transformer.clearParameters();
		transformer.addParameter("urlparamwithoutstart", "?" + getUrlParameterStringExcept(new String[] {"start", "key"}, false));
		transformer.addParameter("urlparamwithoutvieworgroup", "?" + getUrlParameterStringExcept(new String[] {"view", "key", "groupBy"}, false));
		transformer.addParameter("urlparamwithoutsort", "?" + getUrlParameterStringExcept(new String[] {"sortBy", "key"}, true));
		transformer.addParameter("urlparamwithoutvieworgroup", "?" + getUrlParameterStringExcept(new String[] {"view", "key", "viewGroup", "groupBy"}, false));
		transformer.addParameter("urlparamquery", URLEncoder.encode(query, "UTF-8"));
		transformer.addParameter("webserviceurl", this.servlet.getConfig().getExternalWebserviceUrl());
		transformer.addParameter("resultkey", this.getParameter("key", ""));

		// sometimes a pos field is called "function", sometimes "type", sometimes "pos
		// this code allows us to adjust for that
		for(FieldDescriptor fd : this.servlet.getConfig().getWordProperties()) {
			if(fd.getFunction().equalsIgnoreCase("pos"))
				transformer.addParameter("pos_name", fd.getSearchField());
			else if(fd.getFunction().equalsIgnoreCase("lemma"))
				transformer.addParameter("lemma_name", fd.getSearchField());
		}

		// sometimes a title field is called "title", sometimes "title.level1", etc
		// this code allows us to adjust for that
		for(FieldDescriptor fd : this.servlet.getConfig().getFilterFields()) {
			if(fd.getFunction().equalsIgnoreCase("title"))
				transformer.addParameter("title_name", fd.getDisplayField());
			else if(fd.getFunction().equalsIgnoreCase("author"))
				transformer.addParameter("author_name", fd.getDisplayField());
			else if(fd.getFunction().equalsIgnoreCase("date"))
				transformer.addParameter("date_name", fd.getDisplayField());
			else if(fd.getFunction().equalsIgnoreCase("source"))
				transformer.addParameter("source_name", fd.getDisplayField());
		}
	}

	private Map<String, String[]> addFilterParameters(Map<String, String[]> params) {
		for(FieldDescriptor fd : this.servlet.getConfig().getFilterFields()) {
			String[] filterValues = this.getParameterValues(fd.getSearchField(), "");

			if(fd.getType().equalsIgnoreCase("date")) {
				String dateRange = "[" + this.getParameter(fd.getSearchField() + "__from", "0") + " TO " + this.getParameter(fd.getSearchField() + "__to", "3000") + "]";
				filterValues = new String[]{dateRange};
			}

			if(filterValues.length > 0)
				params.put(fd.getSearchField(), filterValues);
		}

		return params;
	}

	private String getQuery() {
		String tab = this.getParameter("tab", "#simple");

		// early out
		if(tab.equalsIgnoreCase("#query"))
			return this.getParameter("querybox", "");

		// otherwise, attempt to make one from the input boxes
		String query = "";

		// make sure that if there are multiple fields containing multiple words,
		// each field contains the same number of words
		if(checkSameNumberOfWordsOrEmpty()) {
			List<FieldDescriptor> fds = this.servlet.getConfig().getWordProperties();

			// get a value for a FieldDescriptor that is not ""
			String words = "";
			for(FieldDescriptor fd : fds) {
				if(getValueFor(fd).length() > 0)
					words = getValueFor(fd);
			}

			// count the amount of words the user wants to search for
			int wordCount = words.split(" " ).length;

			// for each word...
			for(int i = 0; i < wordCount; i++) {
				String queryPart = "[";
				String searchTerm = "";
				boolean isPreceded = false;
				// ...and each FieldDescriptor...
				for(FieldDescriptor fd : fds) {
					searchTerm = getSearchTerm(fd, i, isPreceded);
					if(searchTerm.length() > 0) {
						isPreceded = true;
					}
					// ...get the search term and append it
					queryPart += searchTerm;
				}
				// complete this part and add it to the query
				queryPart += "]";

				// make sure not to add empty word queries
				if(!queryPart.equalsIgnoreCase("[]"))
					query += queryPart + " ";
			}
		} else {
			this.getContext().put("searcherror", "Unequal term count in search fields");
		}

		//System.out.println("query: " + query);
		return query.trim();
	}

	private String getValueFor(FieldDescriptor fd) {
		return escapeBrackets(makeWildcardRegex(this.getParameter(fd.getSearchField(), "")));
	}

	public String getParameterValue(String param) {
		String result = this.getParameter(param, "");

		result = StringUtil.escapeXmlChars(result).replace("\"", "&quot;");

		return result;
	}

	private boolean checkSameNumberOfWordsOrEmpty() {
		int numWords = -1;

		for(FieldDescriptor fd : this.servlet.getConfig().getWordProperties()) {
			String argument = this.getParameter(fd.getSearchField(), "").trim();

			if(argument.length() > 0) {
				if(numWords == -1)
					numWords = argument.split(" ").length;
				else {
					if(argument.split(" ").length != numWords)
						return false;
				}
			}
		}

		return true;
	}

	private String getSearchTerm(FieldDescriptor fd, int index, boolean isPreceded) {
		String argument = getValueFor(fd);

		String[] words = argument.split(" ");

		// remove wildcard queries for words at the start or end of a query - as long as it is not
		if(index < words.length && words[index].equalsIgnoreCase(".*")) {
			if((index == 0 || index == words.length - 1) && words.length > 1) {
				return "";
			}

			if(isPreceded) {
				return "";
			}
		}

		if(index < words.length && argument.length() > 0) {
			String sensitive = "";
			String preceded = "";

			if(isPreceded)
				preceded += " & ";

			if(!getCaseSensitivity(fd))
				sensitive = "(?i)";

			return preceded + fd.getSearchField() + "=\"" + sensitive + words[index] + "\"";
		}

		return "";
	}

	private boolean getCaseSensitivity(FieldDescriptor fd) {
		if(!fd.isSensitive)
			return false;

		return this.getParameter(fd.getSearchField() + "_case", false);
	}

	private String makeWildcardRegex(String original) {
		return original.replaceAll("\\*", ".*");
	}

	private String escapeBrackets(String original) {
		return original.replaceAll("\\(", "\\\\(").replaceAll("\\)", "\\\\)");
	}

	private String getLanguage() {
		return "corpusQL";
	}

	private String getPerHitStylesheet(boolean getResults) throws IOException {
		if(getResults)
			return getStylesheet("perhitresults.xsl");

		return getSearchJobStylesheet();
	}

	private String getPerDocStylesheet(boolean getResults) throws IOException {
		if(getResults)
			return getStylesheet("perdocresults.xsl");

		return getSearchJobStylesheet();
	}

	private String getGroupHitsStylesheet(boolean getResults) throws IOException {
		if(getResults)
			return getStylesheet("groupperhitresults.xsl");

		return getSearchJobStylesheet();
	}

	private String getGroupDocsStylesheet(boolean getResults) throws IOException {
		if(getResults)
			return getStylesheet("groupperdocresults.xsl");

		return getSearchJobStylesheet();
	}

	private String getSearchJobStylesheet() throws IOException {
		return getStylesheet("searchjobresults.xsl");
	}

	/* (non-Javadoc)
	* @see nl.inl.corpuswebsite.BaseResponse#logRequest()
	*/
	@Override
	protected void logRequest() {
		// TODO Auto-generated method stub

	}

	private String getUrlParameterStringExcept(String[] excludes, boolean flipSort) {
		String sortParameter = "sortasc";
		// clear string builder
		builder.delete(0, builder.length());

		Map<String, String[]> params = request.getParameterMap();
		List<String> excludeList = Arrays.asList(excludes);

		boolean containsSortingParameter = false;
		for(String key : params.keySet()) {
			if(!excludeList.contains(key)) {
				String[] values = params.get(key);
				for(int i = 0; i < values.length; i++) {
					String value = values[i];
					if(value.trim().length() > 0) {
						// flip sorting direction
						if(key.equalsIgnoreCase(sortParameter)) {
							if(flipSort)
								value = flipBooleanValue(value.trim());

							containsSortingParameter = true;
						}

						try{
							String encodedValue = URLEncoder.encode(value.trim(), "UTF-8");

							builder.append(key);
							builder.append("=");
							builder.append(encodedValue);
							builder.append("&");
						} catch(UnsupportedEncodingException e) {
							// left blank
						}

					}
				}
			}
		}

		if(!containsSortingParameter){
			builder.append(sortParameter);
			builder.append("=1&");
		}


		return builder.toString();
	}

	private String flipBooleanValue(String value) {
		if(value.equalsIgnoreCase("1"))
			return "0";

		return "1";
	}

	private String getUrlParameterStringExcept(String param) {
		return getUrlParameterStringExcept(new String[] {param}, false);
	}

	@Override
	public BaseResponse duplicate() {
		return new SearchResponse();
	}
}