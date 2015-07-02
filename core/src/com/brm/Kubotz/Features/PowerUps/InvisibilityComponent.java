package com.brm.Kubotz.Features.PowerUps;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Makes an entity Not visible for it's ennemy (Ok partly invisible like 20% alpha)
 */
public class InvisibilityComponent extends EntityComponent {
    public final static String ID = "INVINSIBILITY_COMPONENT";

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}
