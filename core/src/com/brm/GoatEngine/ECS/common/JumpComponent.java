package com.brm.GoatEngine.ECS.common;


import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Allows an entity to be able to jump
 */
public class JumpComponent extends EntityComponent {
    public static final String ID = "JUMP_PROPERTY";

    private int nbJumpsMax; //The Max number of consecutive jumps
    private int nbJujmps;   //The number of consecutive jumps executed so far


    private Timer cooldown; //Cooldown between jumps

    private float speed;   //The jump speed



    /**
     * Defaults the number of jumps to 1
     */
    public JumpComponent(){
        this(1);
    }

    /**
     * Allows to put a defined number of jumps
     * @param nbMaxJumps
     */
    public JumpComponent(int nbMaxJumps){
        this.setNbJumpsMax(nbMaxJumps);
        cooldown = new Timer(500);
        cooldown.start();
        speed = 10;
        nbJumpsMax = 1;
        nbJujmps = 0;
    }

    public JumpComponent(XmlReader.Element componentData){
        super(componentData);
    }





    public int getNbJumpsMax() {
        return nbJumpsMax;
    }

    public void setNbJumpsMax(int nbJumpsMax) {
        this.nbJumpsMax = nbJumpsMax;
    }

    public int getNbJujmps() {
        return nbJujmps;
    }

    public void setNbJujmps(int nbJujmps) {
        this.nbJujmps = nbJujmps;
    }

    public Timer getCooldown() {
        return cooldown;
    }

    public void setCooldown(Timer cooldown) {
        this.cooldown = cooldown;
    }







    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {
        for(XmlReader.Element param: componentData.getChildrenByName("param")){
            String name = param.getAttribute("name");
            String value = param.getText();
            if(name.equals("speed")){
                this.speed = Float.parseFloat(value);
                continue;
            }
            if(name.equals("nbJumpsMax")){
                this.nbJumpsMax = Integer.valueOf(value);
                continue;
            }
            if(name.equals("delay")){
                this.cooldown = new Timer(Integer.valueOf(value));
            }
        }
        nbJujmps = 0;

    }


    public float getSpeed() {
        return speed;
    }
}
