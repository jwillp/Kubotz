package com.brm.Kubotz.Features.Running.Components;

import com.brm.GoatEngine.ECS.core.EntityComponent;

import static com.badlogic.gdx.utils.XmlReader.Element;

/**
 * Enables an entity to Walk/Run
 */
public class RunningComponent extends EntityComponent {
    public static final String ID = "RUNNING_COMPONENT";

    private float speed;     // The speed at which the entity can Run
    private float maxSpeed;  // The MAX speed of a running entity

    public RunningComponent(float speed, float maxSpeed){
        this.speed = speed;
        this.maxSpeed = maxSpeed;
    }
    public RunningComponent(Element componentData){
        super(componentData);
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
            if(name.equals("speed")){
                this.speed = Float.parseFloat(value);
            }else if(name.equals("maxSpeed")){
                this.maxSpeed = Float.parseFloat(value);
            }
        }

    }

    public float getSpeed() {
        return speed;
    }

    public float getMaxSpeed() {
        return maxSpeed;
    }
}
