package com.brm.GoatEngine.ECS.core;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.ECS.core.Entity;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;

/**
 * Enables entities to have Custom Behaviour using Scripts
 */
public class ScriptComponent extends EntityComponent {

    public static final String ID = "SCRIPT_COMPONENT";
    private ArrayList<String> scripts = new ArrayList<String>();


    public ScriptComponent(XmlReader.Element element){
        super(element);
    }
    public ScriptComponent(){}


    /**
     * Adds a script to the component
     * @param scriptFilePath
     */
    public void addScript(String scriptFilePath){
        if(this.scripts == null){
            this.scripts = new ArrayList<String>();
        }
        this.scripts.add(scriptFilePath);
    }


    /**
     * Removes a script from the component
     * @param scriptFilePath
     */
    public void removeScript(String scriptFilePath){
        this.scripts.remove(scriptFilePath);
    }

    /**
     * Returns all the scripts
     * @return the scripts
     */
    public ArrayList<String> getScripts() {
        return scripts;
    }


    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {
        for(XmlReader.Element script: componentData.getChildrenByName("script")){
            this.addScript(script.getText());
        }
    }
}
