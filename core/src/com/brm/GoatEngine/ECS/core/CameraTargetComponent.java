package com.brm.GoatEngine.ECS.core;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Used to make an entity important for a camera.
 * The cameras concentrate on these kind of entities.
 */
public class CameraTargetComponent extends EntityComponent {
    public final static String ID = "CAMERA_TARGET_PROPERTY";

    public CameraTargetComponent(){}
    public CameraTargetComponent(XmlReader.Element componentData){
        super(componentData);

    }


    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {
        //Nothing to do here
    }
}
