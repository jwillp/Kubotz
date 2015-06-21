package com.brm.Kubotz.Features.Grab.Components;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Makes an entity able to grab/pick up objects and throw them away.
 * Entities with this component can pickup other entities with a Grabbable entities
 */
public class GrabComponent extends EntityComponent {
    public  final static String ID = "GRAB_COMPONENT";
    private Timer durationTimer = new Timer(200);
    private Timer cooldown = new Timer(100);  //The delay between uses of grab
    private boolean grabbing;

    public GrabComponent(){
        durationTimer.start();
        cooldown.start();
    }

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }

    public Timer getDurationTimer() {
        return durationTimer;
    }

    public Timer getCooldown() {
        return cooldown;
    }

    public void setGrabbing(boolean grabbing) {
        this.grabbing = grabbing;
    }

    public boolean isGrabbing() {
        return grabbing;
    }
}
