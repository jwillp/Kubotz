package com.brm.GoatEngine.ECS.common;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * A component enabling an entity to act as a camera.
 *
 */
public class CameraComponent extends EntityComponent{

    public static final String ID = "CAMERA_COMPONENT";

    private final OrthographicCamera camera;

    public CameraComponent(){
        camera = new OrthographicCamera();
    }

    /**
     * Constructor getting a XML element to load data
     * @param componentData
     */
    public  CameraComponent(XmlReader.Element componentData){
        super(componentData);
        camera = new OrthographicCamera();
    }



    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }

    public OrthographicCamera getCamera() {
        return camera;
    }
}
