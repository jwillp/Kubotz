package com.brm.GoatEngine.Files;

import com.badlogic.gdx.utils.XmlWriter;

import javax.sql.rowset.spi.XmlReader;

/**
 * Xml Serializable
 */
public interface XmlSerializable {

    /**
     * Writes the data to xml via an XmlReader
     * @param xml
     */
    public void serialize(XmlWriter xml);


    public void deserialize(XmlReader reader);

}
