package com.brm.Kubotz.Component.AI;

import java.util.ArrayList;

import com.brm.GoatEngine.AI.Pathfinding.Node;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.AI.KubotzBehaviours.KubotzBehaviour;
import com.brm.Kubotz.AI.KubotzPathFinder;

/**
 * Component to make a kubotz behave by itself (AI)
 */
public class KubotzAIComponent extends EntityComponent {
    public static final String ID = "KUBOTZ_AI_COMPONENT";

    public Timer reactionTime = new Timer(500); //The time it will take for the AI to execute

    public KubotzBehaviour behaviourTree;
    
    public ArrayList<Node> currentPath; //Current pathfinding path


    /**
     * Ctor
     * @param em Entity Manager
     * @param entity the entity this component is attached to
     */
    public KubotzAIComponent(EntityManager em, Entity entity, KubotzPathFinder pathfinder){
        behaviourTree  = new KubotzBehaviour(em, entity, pathfinder);
        reactionTime.start();
    }


}
