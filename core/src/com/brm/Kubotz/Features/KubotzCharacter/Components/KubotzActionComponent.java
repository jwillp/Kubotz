package com.brm.Kubotz.Features.KubotzCharacter.Components;


import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * This component is used to determine what is the desired action to be performed by the entity
 * This component will be used by a CharacterControllerScript to detect what that action could be based
 * on input.
 */
public class KubotzActionComponent extends EntityComponent {
    public final static  String ID = "KUBOTZ_ACTION_COMPONENT";

    private Action action = Action.NONE;

    public Action getAction() {
        return action;
    }

    public void setAction(Action action) {
        this.action = action;
    }

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }


    /**
     * All the possible actions to be performed by a Kubotz
     */
    public enum Action{

        CROUCH,         // TODO
        BLOCK,          // TODO
        DODGE_LEFT,     // TODO
        DODGE_RIGHT,    // TODO

        //Movement
        RUN_LEFT,
        RUN_RIGHT,
        JUMP,
        FALL_DOWN,

    //Attacks (PUNCHES AND KICKS I.E. MELEE)
        //AERIALS
        AIR_ATTACK_UP,      // TODO
        AIR_ATTACK_NEUTRAL,
        AIR_ATTACK_DOWN,    // TODO
        AIR_ATTACK_FORWARD, // TODO
        AIR_ATTACK_BACK,    // TODO

        //GROUND
        GROUND_ATTACK_UP,       // TODO
        GROUND_ATTACK_NEUTRAL,
        GROUND_ATTACK_DOWN,     // TODO
        GROUND_ATTACK_FORWARD,  // TODO
        GROUND_ATTACK_BACK,     // TODO

    //SPECIALS
        //FLY
        TOGGLE_FLY_MODE,

        //DASH
        DASH_UP,
        DASH_DOWN,
        DASH_LEFT,
        DASH_RIGHT,

        //Gravity
        TOGGLE_ANTI_GRAVITY,

        //DRONE GAUNTLET
        SPAWN_DRONE,

    // OTHER
        //SWORD
            //AERIALS
            AIR_SWORD_UP,
            AIR_SWORD_NEUTRAL,
            AIR_SWORD_DOWN,
            AIR_SWORD_FORWARD,
            AIR_SWORD_BACK,

            //GROUND
            GROUND_SWORD_UP,
            GROUND_SWORD_NEUTRAL,
            GROUND_SWORD_DOWN,
            GROUND_SWORD_FORWARD,
            GROUND_SWORD_BACK,


        //GUN
            SHOOT,


        //GRAB
            GRAB,
            THROW,




        NONE //Nothing is requested
    }





}
