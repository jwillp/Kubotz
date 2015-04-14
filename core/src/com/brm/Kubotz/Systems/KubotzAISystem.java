package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.AI.Pathfinding.Node;
import com.brm.GoatEngine.AI.Pathfinding.Pathfinder;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.AI.KubotzPathFinder;
import com.brm.Kubotz.Component.AI.KubotzAIComponent;
import com.brm.Kubotz.Component.Skills.ActiveSkill;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;

import java.util.ArrayList;

/**
 * Use to process AI logic of Kubotz
 */
public class KubotzAISystem extends EntitySystem {


    public KubotzAISystem(EntityManager em) {
        super(em);
    }

    public KubotzPathFinder pathfinder = new KubotzPathFinder();


    public void update(){

        // UPDATE PATHFINDER (RESCAN MAP)
        this.pathfinder.scanMap(em.getEntitiesWithTag(Constants.ENTITY_TAG_PLATFORM));

        // UPDATE BEHAVIOUR TREES OF KUBOTZ
        for(Entity eAI : em.getEntitiesWithComponent(KubotzAIComponent.ID)){
            KubotzAIComponent aiComp = (KubotzAIComponent) eAI.getComponent(KubotzAIComponent.ID);

            aiComp.behaviourTree.tick();



        }





    }



}
