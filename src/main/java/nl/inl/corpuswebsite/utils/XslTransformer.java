package nl.inl.corpuswebsite.utils;

import java.io.File;
import java.io.InputStream;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;

import javax.xml.transform.OutputKeys;
import javax.xml.transform.Templates;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;

public class XslTransformer {

    /**
     * Threadsafe as long as you don't change Configuration, which we don't.
     * See https://saxonica.plan.io/boards/2/topics/5645.
     */
    private static final TransformerFactory FACTORY =
        TransformerFactory.newInstance("net.sf.saxon.TransformerFactoryImpl", XslTransformer.class.getClassLoader());
    private Map<String, String> params = new HashMap<>();

    private final Transformer transformer;

    private static final Map<File, Templates> FILETEMPLATES = new HashMap<>();

    private static Templates getTemplates(File f) {
        synchronized (FILETEMPLATES) {
            if (!FILETEMPLATES.containsKey(f)) {
                try {
                    FILETEMPLATES.put(f, FACTORY.newTemplates(new StreamSource(f)));
                } catch (TransformerConfigurationException ex) {
                    throw new RuntimeException(ex);
                }
            }
        }
        return FILETEMPLATES.get(f);

    }

    public XslTransformer(File stylesheet) throws TransformerConfigurationException {
        transformer = getTemplates(stylesheet).newTransformer();
    }

    public XslTransformer(InputStream stylesheet) throws TransformerConfigurationException {
        transformer = FACTORY.newTransformer(new StreamSource(stylesheet));
    }

    public XslTransformer(Reader stylesheet) throws TransformerConfigurationException {
        transformer = FACTORY.newTransformer(new StreamSource(stylesheet));
    }

    public String transform(String source)
        throws TransformerException {
        StreamSource ssSource = new StreamSource(new StringReader(source));
        StringWriter result = new StringWriter();
        StreamResult streamResult = new StreamResult(result);

        synchronized (transformer) {
            for (Entry<String, String> e : params.entrySet())
                transformer.setParameter(e.getKey(), e.getValue());

            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");
            transformer.transform(ssSource, streamResult);
            transformer.reset();
        }

        return result.toString();
    }

    public void addParameter(String key, String value) {
        params.put(key, value);
    }

    public void clearParameters() {
        params.clear();
    }
}
