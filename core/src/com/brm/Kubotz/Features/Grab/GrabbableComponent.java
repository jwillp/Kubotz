package com.brm.Kubotz.Features.Grab;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Makes an object grabbable
 */
public class GrabbableComponent extends EntityComponent {

    public final static String ID = "GRABBABLE_COMPONENT";


    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}
