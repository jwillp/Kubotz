package com.brm.GoatEngine.ECS.core;


import com.badlogic.gdx.utils.XmlReader.Element;
import com.brm.GoatEngine.Files.XmlSerializable;

import java.io.IOException;
import java.lang.reflect.Field;

public abstract class EntityComponent implements XmlSerializable{


    private boolean enabled = true; //By default a component is enabled


    public EntityComponent(Element element){
        this.deserialize(element);
    }

    public EntityComponent(boolean enabled){
        this.setEnabled(enabled);
    }

    public EntityComponent(){}




    /**
     * Called when the component is attached to an entity
     */
    public void onAttach(Entity entity){}

    /**
     * Called when the component is detached from an entity
     */
    public void onDetach(Entity entity){}




    /**
     * Returns if the component is enabled
     * @return
     */
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    /**
     * Returns if the component is disabled
     * @return
     */
    public boolean isDisabled(){
        return !enabled;
    }






    /**
     * Desiralizes a component
     * @param componentData the data as an XML element
     */
    public abstract void deserialize(Element componentData);





    /**
     * Writes the data to xml via an XmlReader
     *
     * @param xml
     */
    @Override
    public void serialize(com.badlogic.gdx.utils.XmlWriter xml){
        try {
            xml.element("component", this.getClass().getCanonicalName());
            Class<?> clazz = this.getClass();
            for(Field f : clazz.getDeclaredFields()){
                xml.element("param").attribute("name", f.getName())
                        .text(f.get(this));
            }
            xml.pop();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }


}
