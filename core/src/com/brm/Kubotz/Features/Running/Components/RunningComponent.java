package com.brm.Kubotz.Features.Running.Components;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Enables an entity to Walk/Run
 */
public class RunningComponent extends EntityComponent {
    public static final String ID = "RUNNING_COMPONENT";

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }
}
