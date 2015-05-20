package com.brm.Kubotz.Components.Parts.Boots;

import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * Boots giving a Kubotz the ability to reverse the effect of gravity on itself
 */
public class MagneticBootsComponent extends EntityComponent {
    public static final String ID = "MAGNETIC_BOOTS_COMPONENT";

    private float startingAngle; //In DEGREE

    public MagneticBootsComponent() {
        this.setEnabled(false);
    }


    public float getStartingAngle() {
        return startingAngle;
    }

    public void setStartingAngle(float startingAngle) {
        this.startingAngle = startingAngle;
    }
}
