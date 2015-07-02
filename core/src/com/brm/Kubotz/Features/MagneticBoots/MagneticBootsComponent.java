package com.brm.Kubotz.Features.MagneticBoots;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Boots giving a Kubotz the ability to reverse the effect of gravity on itself
 */
public class MagneticBootsComponent extends EntityComponent {
    public static final String ID = "MAGNETIC_BOOTS_COMPONENT";

    private float startingAngle; //In DEGREE

    public MagneticBootsComponent() {
        this.setEnabled(false);
    }

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }


    public float getStartingAngle() {
        return startingAngle;
    }

    public void setStartingAngle(float startingAngle) {
        this.startingAngle = startingAngle;
    }
}
