package com.brm.GoatEngine.Physics.Hitbox;

/**
 * Represents a hitbox. A hitbox is the main structure to represent
 * the execution of an attack. It is also used to represent how the physical structure
 * of the entities in the game interact with attacks.
 */
public class Hitbox implements Cloneable{

    public final static String DEFAULT_LABEL = "UNDEFINED"; // A generic label for hitbox with none provided

    /**
     * All the different types of hitboxes
     * The ones with [COLLIDE] tag means that they will change their movement when another [COLLIDE] collides with it.
     * The ones with [NON-COLLIDE] tag means the they will pass through anything
     */
    public enum Type{
        Inert,       // Box type used solely for collision detection, not responding to any attacks. [COLLIDE]
        Damageable,  // Hurt box, the vulnerable area of an entity. [COLLIDE]
        Offensive,   // Used for most attacks, they deal damage upon collision with another hitbox. [NON-COLLIDE]
        Intangible,  // Act like sensors and no damage will be taken upon collision with it. [NON-COLLIDE]
        Invincible,  // Will collide, but no damage will be taken
        Grab,        // Used for the Grab reach of an entity [NON-COLLIDE]
        Shield,      // Used to represent a shield [COLLIDE]

    }

    public Type type;

    public final String label;


    // These are public for simplicity of use
    public float damage = 0;        // The damage dealt by the hitbox
    public float knockback = 0;     // The knockback dealt by the hitbox; positive => right, negative => left
    public float angle = 0;         // The angle of the knocback
    public float freezeFrames = 0;  // The number of frames to freeze for the entities on impact


    /**
     * Ctor with default label
     * @param type
     */
    public Hitbox(Type type) {
        this(type, DEFAULT_LABEL);
    }

    /**
     * Ctor
     * @param type
     * @param label
     */
    public Hitbox(Type type, String label){
        this.type = type;
        this.label = label;
    }








}
