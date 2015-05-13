package com.brm.Kubotz.Component;

import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Makes an entity able to grab/pick up objects and throw them away.
 * Entities with this component can pickup other entities with a PickableComponent
 */
public class GrabComponent extends Component {
    public  final static String ID = "GRAB_COMPONENT";

    //TODO grab radius?
}
