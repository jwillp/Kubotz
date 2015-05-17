package com.brm.Kubotz.Components;

import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * Makes an entity able to grab/pick up objects and throw them away.
 * Entities with this component can pickup other entities with a PickableComponent
 */
public class GrabComponent extends EntityComponent {
    public  final static String ID = "GRAB_COMPONENT";

    //TODO grab radius?
}
