package com.brm.Kubotz.Features.PowerUps.Components;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Makes an entity Invicible
 */
public class InvincibilityComponent extends EntityComponent {
    public final static String ID = "INVINCIBLE";

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}
