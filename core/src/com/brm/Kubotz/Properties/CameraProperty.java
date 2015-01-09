package com.brm.Kubotz.Properties;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.brm.GoatEngine.ECS.Properties.Property;

/**
 * Used to add a camera to an entity So the entity becomes a Camera itself
 * (it is not meant to be added to a player for instance)
 */
public class CameraProperty extends Property{

    public OrthographicCamera camera;

    public CameraProperty() {

    }

}
