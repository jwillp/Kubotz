package com.brm.Kubotz.Features.Grab.Components;

import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

import static com.badlogic.gdx.utils.XmlReader.*;

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

    public GrabComponent(XmlReader.Element element){
        super(element);
    }



    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(Element componentData) {

        for(Element param: componentData.getChildrenByName("param")){
            String name = param.getAttribute("name");
            String value = param.getText();
            if(name.equals("duration")){
              durationTimer = new Timer(Integer.valueOf(value));
            }else if(name.equals("cooldown")){
                cooldown = new Timer(Integer.valueOf(value));
            }
        }
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
